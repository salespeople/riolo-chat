'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { produce } from 'immer';
import { useFirestore, useUser } from '@/firebase';
import { getSidebarDisplaySettings, setSidebarDisplaySettings } from '@/lib/sidebar';
import { useToast } from '@/hooks/use-toast';
import { useBotStore } from '@/stores/bot-store';

// Definisce i campi specifici per la sezione Dettagli
export interface ContactDetailsVisibility {
  phone: boolean;
  contactId: boolean;
  status: boolean;
  isChatOpened: boolean;
  lastActivity: boolean;
}

// Definisce la visibilità per le variabili, indicizzata per nome
export type VariablesVisibility = Record<string, boolean>;

// Struttura aggiornata delle impostazioni di visualizzazione
export interface DisplaySettings {
  contactDetails: {
    showSection: boolean;
    fields: ContactDetailsVisibility;
  };
  variables: {
    showSection: boolean;
    fields: VariablesVisibility;
  };
  pauseAutomation: boolean;
  tags: boolean;
  operator: boolean;
}

// Stato predefinito con la nuova struttura nidificata
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  contactDetails: {
    showSection: true,
    fields: {
      phone: true,
      contactId: true,
      status: true,
      isChatOpened: true,
      lastActivity: true,
    },
  },
  variables: {
    showSection: true,
    fields: {}, // Inizialmente vuoto, verrà popolato dinamicamente
  },
  pauseAutomation: true,
  tags: true,
  operator: true,
};

interface SidebarDisplayContextType {
  displaySettings: DisplaySettings;
  isDisplaySettingsLoading: boolean;
  setDisplaySettings: (updater: Partial<DisplaySettings> | ((draft: DisplaySettings) => void)) => void;
  initializeVariableSettings: (variableNames: string[]) => void;
}

const SidebarDisplayContext = createContext<SidebarDisplayContextType | undefined>(undefined);

export const SidebarDisplayProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [isDisplaySettingsLoading, setIsDisplaySettingsLoading] = useState(true);
  const { activeBotId } = useBotStore();

  useEffect(() => {
    const fetchSettings = async () => {
      if (firestore && user) {
        setIsDisplaySettingsLoading(true);
        try {
          const storedSettings = await getSidebarDisplaySettings(firestore, activeBotId ?? undefined);
          if (storedSettings) {
             const mergedSettings = produce(DEFAULT_DISPLAY_SETTINGS, draft => {
                draft.pauseAutomation = storedSettings.pauseAutomation ?? draft.pauseAutomation;
                draft.tags = storedSettings.tags ?? draft.tags;
                draft.operator = storedSettings.operator ?? draft.operator;
                
                if (storedSettings.contactDetails) {
                    draft.contactDetails.showSection = storedSettings.contactDetails.showSection ?? draft.contactDetails.showSection;
                    Object.assign(draft.contactDetails.fields, storedSettings.contactDetails.fields);
                }
                if (storedSettings.variables) {
                    draft.variables.showSection = storedSettings.variables.showSection ?? draft.variables.showSection;
                    Object.assign(draft.variables.fields, storedSettings.variables.fields);
                }
            });
            setDisplaySettings(mergedSettings);
          }
        } catch (error) {
          console.warn("Failed to fetch sidebar display settings from Firestore", error);
        } finally {
          setIsDisplaySettingsLoading(false);
        }
      } else if (!isUserLoading && !user) {
        setIsDisplaySettingsLoading(false);
      }
    };
    fetchSettings();
  }, [firestore, activeBotId, user, isUserLoading]);

  const handleSetDisplaySettings = useCallback((updater: Partial<DisplaySettings> | ((draft: DisplaySettings) => void)) => {
    const newSettings = produce(displaySettings, typeof updater === 'function' ? updater : draft => {
      Object.assign(draft, updater);
    });

    setDisplaySettings(newSettings); // Optimistic update

    if (firestore && user?.role === 'admin' && activeBotId) {
      setSidebarDisplaySettings(firestore, newSettings, activeBotId).catch(error => {
        console.error("Failed to save sidebar display settings to Firestore", error);
        // Optional: Revert optimistic update on failure
        setDisplaySettings(displaySettings); 
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare le impostazioni di visualizzazione.' });
      });
    }
  }, [displaySettings, firestore, toast, user, activeBotId]);

  const initializeVariableSettings = useCallback((variableNames: string[]) => {
     handleSetDisplaySettings(draft => {
        const currentVarKeys = Object.keys(draft.variables.fields);
        let updated = false;
        variableNames.forEach(name => {
            if (!currentVarKeys.includes(name)) {
                draft.variables.fields[name] = true; // Imposta su true per le nuove variabili
                updated = true;
            }
        });
     });
  }, [handleSetDisplaySettings]);


  return (
    <SidebarDisplayContext.Provider value={{ displaySettings, isDisplaySettingsLoading, setDisplaySettings: handleSetDisplaySettings, initializeVariableSettings }}>
      {children}
    </SidebarDisplayContext.Provider>
  );
};

export const useSidebarDisplay = () => {
  const context = useContext(SidebarDisplayContext);
  if (context === undefined) {
    throw new Error('useSidebarDisplay must be used within a SidebarDisplayProvider');
  }
  return context;
};
