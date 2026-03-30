
"use server";

import { revalidatePath } from "next/cache";
import { userInputSchema, userEditSchema } from "@/types/schemas";
import type { UserInput, UserEditInput } from "@/types";
import { getAuthAdmin, getDb } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

export async function addUser(userData: UserInput, appInstanceId: string) {
    let createdUserUid: string | undefined = undefined;
    try {
        const authAdmin = getAuthAdmin();
        const db = getDb();

        const userRecord = await authAdmin.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.name,
            emailVerified: true,
            disabled: false,
        });

        createdUserUid = userRecord.uid;

        // Set custom claims based on role
        if (userData.role === 'admin') {
            await authAdmin.setCustomUserClaims(createdUserUid, { admin: true });
        }

        const instanceIdArray = userData.role === 'admin' ? [] : [appInstanceId];

        const userRef = db.collection("users").doc(createdUserUid);
        await userRef.set({
            uid: createdUserUid,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            operatorId: userData.operatorId,
            instanceId: instanceIdArray,
            lastLogin: null,
            createdAt: FieldValue.serverTimestamp(),
            color: userData.color || '#0ea54f',
        });

        return userRecord;

    } catch (error: any) {
        if (createdUserUid) {
            try {
                const authAdmin = getAuthAdmin();
                await authAdmin.deleteUser(createdUserUid);
            } catch (rollbackError) {
                console.error(`CRITICAL: Rollback failed for user ${createdUserUid}. Manual cleanup required.`, rollbackError);
            }
        }

        if (error.code === 'auth/email-already-exists') {
            throw new Error("Un utente con questa email esiste già.");
        }

        console.error("Error creating user:", error);
        throw new Error("Impossibile creare l'utente a causa di un errore interno.");
    }
}

export async function updateUser(userData: UserEditInput) {
    try {
        const authAdmin = getAuthAdmin();
        const db = getDb();

        // 1. Update Firebase Authentication user properties
        await authAdmin.updateUser(userData.uid, {
            email: userData.email,
            displayName: userData.name,
        });

        // 2. Set custom claims based on the new role
        await authAdmin.setCustomUserClaims(userData.uid, { admin: userData.role === 'admin' });

        const instanceIdArray = userData.role === 'admin'
            ? []
            : userData.instanceId || [];


        // 3. Update Firestore document
        const userRef = db.collection("users").doc(userData.uid);
        await userRef.update({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            operatorId: userData.operatorId,
            instanceId: instanceIdArray,
            color: userData.color,
        });

        return { success: true };

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new Error("Un altro utente sta già utilizzando questa email.");
        }
        if (error.code === 'auth/user-not-found') {
            throw new Error("Utente non trovato in Firebase Authentication.");
        }

        console.error("Error updating user:", error);
        throw new Error("Impossibile aggiornare l'utente a causa di un errore interno.");
    }
}

export async function deleteUser(uid: string) {
    try {
        const authAdmin = getAuthAdmin();
        await authAdmin.deleteUser(uid);

        const db = getDb();
        const userRef = db.collection("users").doc(uid);
        await userRef.delete();

        return { success: true };

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // If the user is not in Auth, maybe they are just in Firestore.
            // Let's try to delete from Firestore anyway.
            try {
                const db = getDb();
                const userRef = db.collection("users").doc(uid);
                await userRef.delete();
                console.warn(`User ${uid} not found in Auth, but deleted from Firestore.`);
                return { success: true };
            } catch (firestoreError) {
                console.error(`Error deleting user ${uid} from Firestore after Auth-delete failed:`, firestoreError);
                throw new Error("Impossibile eliminare l'utente da Firestore.");
            }
        }
        console.error("Error deleting user:", error);
        throw new Error("Impossibile eliminare l'utente a causa di un errore interno.");
    }
}


export async function updateUserLastLogin(uid: string): Promise<void> {
    try {
        const db = getDb();
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            lastLogin: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error(`Failed to update last login for user ${uid}:`, error);
        // We don't throw here to avoid breaking the user flow for a non-critical update
    }
}

export async function createUserAction(data: UserInput): Promise<{ success: boolean, message: string }> {
    const validation = userInputSchema.safeParse(data);
    if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => e.message).join(' ');
        return { success: false, message: errorMessages || "Dati non validi. Controlla i campi." };
    }

    try {
        const appInstanceId = process.env.NEXT_PUBLIC_APP_INSTANCE_ID || '';
        await addUser(validation.data, appInstanceId);
        revalidatePath("/users");
        return { success: true, message: "Utente creato con successo!" };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: errorMessage || "Errore nella creazione utente." };
    }
}

export async function updateUserAction(data: UserEditInput): Promise<{ success: boolean, message: string }> {
    const validation = userEditSchema.safeParse(data);
    if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => e.message).join(' ');
        return { success: false, message: errorMessages || "Dati non validi. Controlla i campi." };
    }

    try {
        await updateUser(validation.data);
        revalidatePath("/users");
        return { success: true, message: "Utente aggiornato con successo!" };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: errorMessage || "Errore nell'aggiornamento dell'utente." };
    }
}

export async function deleteUserAction(uid: string): Promise<{ success: boolean, message: string }> {
    if (!uid) {
        return { success: false, message: "ID utente non fornito." };
    }

    try {
        await deleteUser(uid);
        revalidatePath("/users");
        return { success: true, message: "Utente eliminato con successo!" };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: errorMessage || "Errore nell'eliminazione dell'utente." };
    }
}

export async function updateLastLoginAction(uid: string): Promise<{ success: boolean, message?: string }> {
    if (!uid) {
        return { success: false, message: "ID utente non fornito." };
    }
    try {
        await updateUserLastLogin(uid);
        return { success: true };
    } catch (error) {
        console.error("Failed to update last login:", error);
        return { success: false, message: "Failed to update last login timestamp." };
    }
}
