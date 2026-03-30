'use client';

import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import type { ThemeSettings } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const THEME_COLLECTION_PATH = 'settings';
const GLOBAL_THEME_DOC_ID = 'theme';
const INSTANCES_SUBCOLLECTION = 'instances';

/**
 * Retrieves theme settings for a specific app instance, with fallback to global settings.
 * @param firestore - The Firestore instance.
 * @param appInstanceId - The ID of the current app instance (e.g., 'palermo1').
 * @returns The merged theme settings object.
 */
export async function getThemeSettings(firestore: Firestore, appInstanceId?: string): Promise<ThemeSettings | null> {
    const globalDocRef = doc(firestore, THEME_COLLECTION_PATH, GLOBAL_THEME_DOC_ID);
    
    let globalSettings: ThemeSettings | null = null;
    let instanceSettings: Partial<ThemeSettings> | null = null;

    try {
        const globalSnap = await getDoc(globalDocRef);
        if (globalSnap.exists()) {
            globalSettings = globalSnap.data() as ThemeSettings;
        }
    } catch (error) {
        console.error("Error getting global theme settings:", error);
        const contextualError = new FirestorePermissionError({
            path: globalDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', contextualError);
    }

    if (appInstanceId) {
        const instanceDocRef = doc(firestore, THEME_COLLECTION_PATH, GLOBAL_THEME_DOC_ID, INSTANCES_SUBCOLLECTION, appInstanceId);
        try {
            const instanceSnap = await getDoc(instanceDocRef);
            if (instanceSnap.exists()) {
                instanceSettings = instanceSnap.data() as Partial<ThemeSettings>;
            }
        } catch (error) {
            console.error(`Error getting theme settings for instance ${appInstanceId}:`, error);
            // Non bloccare se le impostazioni dell'istanza falliscono, usa le globali.
        }
    }

    if (!globalSettings && !instanceSettings) {
        return null; // Nessuna impostazione trovata
    }

    // Unisci le impostazioni, quelle dell'istanza sovrascrivono quelle globali
    return { ...globalSettings, ...instanceSettings } as ThemeSettings;
}


/**
 * Saves theme settings. Saves to the instance-specific document if an ID is provided,
 * otherwise updates the global theme document.
 * @param firestore - The Firestore instance.
 * @param settings - The theme settings to save.
 * @param appInstanceId - The ID of the app instance to save settings for.
 */
export function setThemeSettings(firestore: Firestore, settings: Partial<ThemeSettings>, appInstanceId?: string): Promise<void> {
    let docRef;
    if (appInstanceId) {
        // Salva le impostazioni specifiche per l'istanza
        docRef = doc(firestore, THEME_COLLECTION_PATH, GLOBAL_THEME_DOC_ID, INSTANCES_SUBCOLLECTION, appInstanceId);
    } else {
        // Salva (o sovrascrive) le impostazioni globali/di default
        docRef = doc(firestore, THEME_COLLECTION_PATH, GLOBAL_THEME_DOC_ID);
    }
    
    return setDoc(docRef, settings, { merge: true }).catch(error => {
        const contextualError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: settings,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
    });
}
