'use client';

import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import type { DisplaySettings } from '@/components/settings/sidebar-display-provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const SIDEBAR_SETTINGS_COLLECTION_PATH = 'settings';
const GLOBAL_SIDEBAR_SETTINGS_DOC_ID = 'sidebarDisplay';
const INSTANCES_SUBCOLLECTION = 'instances';

/**
 * Retrieves sidebar display settings for a specific app instance, with fallback to global settings.
 * @param firestore - The Firestore instance.
 * @param appInstanceId - The ID of the current app instance (e.g., 'palermo1').
 * @returns The merged display settings object or null if not found.
 */
export async function getSidebarDisplaySettings(firestore: Firestore, appInstanceId?: string): Promise<Partial<DisplaySettings> | null> {
    const globalDocRef = doc(firestore, SIDEBAR_SETTINGS_COLLECTION_PATH, GLOBAL_SIDEBAR_SETTINGS_DOC_ID);

    let globalSettings: Partial<DisplaySettings> | null = null;
    let instanceSettings: Partial<DisplaySettings> | null = null;

    try {
        const globalSnap = await getDoc(globalDocRef);
        if (globalSnap.exists()) {
            globalSettings = globalSnap.data() as Partial<DisplaySettings>;
        }
    } catch (error) {
        console.error("Error getting global sidebar settings:", error);
        const contextualError = new FirestorePermissionError({
            path: globalDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', contextualError);
    }
    
    if (appInstanceId) {
        const instanceDocRef = doc(firestore, SIDEBAR_SETTINGS_COLLECTION_PATH, GLOBAL_SIDEBAR_SETTINGS_DOC_ID, INSTANCES_SUBCOLLECTION, appInstanceId);
        try {
            const instanceSnap = await getDoc(instanceDocRef);
            if (instanceSnap.exists()) {
                instanceSettings = instanceSnap.data() as Partial<DisplaySettings>;
            }
        } catch (error) {
            console.warn(`Error getting sidebar settings for instance ${appInstanceId}:`, error);
        }
    }

    if (!globalSettings && !instanceSettings) {
        return null;
    }

    // Deep merge logic: start with global, then merge instance settings on top.
    const merged: DisplaySettings = JSON.parse(JSON.stringify(globalSettings || {}));
    
    if (instanceSettings) {
      // Merge top-level properties
      Object.assign(merged, {
          pauseAutomation: instanceSettings.pauseAutomation ?? merged.pauseAutomation,
          tags: instanceSettings.tags ?? merged.tags,
          operator: instanceSettings.operator ?? merged.operator,
      });

      // Merge contactDetails
      if (instanceSettings.contactDetails) {
          if (!merged.contactDetails) merged.contactDetails = { showSection: true, fields: {} as any };
          merged.contactDetails.showSection = instanceSettings.contactDetails.showSection ?? merged.contactDetails.showSection;
          Object.assign(merged.contactDetails.fields, instanceSettings.contactDetails.fields);
      }

      // Merge variables
      if (instanceSettings.variables) {
          if (!merged.variables) merged.variables = { showSection: true, fields: {} };
          merged.variables.showSection = instanceSettings.variables.showSection ?? merged.variables.showSection;
          Object.assign(merged.variables.fields, instanceSettings.variables.fields);
      }
    }

    return merged;
}

/**
 * Saves the sidebar display settings to Firestore for a specific instance.
 * @param firestore - The Firestore instance.
 * @param settings - The display settings to save.
 * @param appInstanceId - The ID of the app instance.
 */
export function setSidebarDisplaySettings(firestore: Firestore, settings: Partial<DisplaySettings>, appInstanceId: string): Promise<void> {
    const docRef = doc(firestore, SIDEBAR_SETTINGS_COLLECTION_PATH, GLOBAL_SIDEBAR_SETTINGS_DOC_ID, INSTANCES_SUBCOLLECTION, appInstanceId);
    
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
