'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { produce } from 'immer';

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
  const [displaySettings, setDisplaySettingsState] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  const handleSetDisplaySettings = useCallback((updater: Partial<DisplaySettings> | ((draft: DisplaySettings) => void)) => {
    setDisplaySettingsState(current =>
      produce(current, typeof updater === 'function' ? updater : draft => {
        Object.assign(draft, updater);
      })
    );
  }, []);

  const initializeVariableSettings = useCallback((variableNames: string[]) => {
    handleSetDisplaySettings(draft => {
      const currentVarKeys = Object.keys(draft.variables.fields);
      variableNames.forEach(name => {
        if (!currentVarKeys.includes(name)) {
          draft.variables.fields[name] = true;
        }
      });
    });
  }, [handleSetDisplaySettings]);

  return (
    <SidebarDisplayContext.Provider value={{
      displaySettings,
      isDisplaySettingsLoading: false,
      setDisplaySettings: handleSetDisplaySettings,
      initializeVariableSettings,
    }}>
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
