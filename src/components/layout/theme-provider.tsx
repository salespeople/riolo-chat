'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { getThemeSettings, setThemeSettings } from '@/lib/theme';
import type { ThemeSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { APP_DEFAULTS } from '@/config/app.config';
import { useBotStore } from '@/stores/bot-store';

export const DEFAULT_THEME: ThemeSettings = {
    primaryColor: APP_DEFAULTS.theme.primaryColor,
    accentColor: APP_DEFAULTS.theme.accentColor,
    headerName: 'Chat Manager',
    logoUrl: "",
    logoEmoji: APP_DEFAULTS.theme.logoEmoji,
};

interface ThemeContextType {
    theme: ThemeSettings;
    isThemeLoading: boolean;
    updateTheme: (newSettings: Partial<ThemeSettings>) => Promise<void>;
    resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser(); // Get user auth state
    const { toast } = useToast();
    const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
    const [isThemeLoading, setIsThemeLoading] = useState(true);
    const { activeBotId } = useBotStore();

    useEffect(() => {
        const fetchTheme = async () => {
            if (firestore) {
                setIsThemeLoading(true);
                const settings = await getThemeSettings(firestore, activeBotId ?? undefined);
                setTheme(settings || DEFAULT_THEME);
                setIsThemeLoading(false);
            }
        };

        // Only fetch theme after auth state is resolved and a user exists
        if (!isUserLoading && user) {
            fetchTheme();
        } else if (!isUserLoading && !user) {
            // If user is not logged in, stop loading and use default theme
            setIsThemeLoading(false);
        }
    }, [firestore, activeBotId, user, isUserLoading]);

    const updateTheme = useCallback(async (newSettings: Partial<ThemeSettings>) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Firestore non disponibile.' });
            return;
        }

        const updatedTheme = produce(theme, draft => {
            Object.assign(draft, newSettings);
        });

        setTheme(updatedTheme); // Optimistic update

        try {
            await setThemeSettings(firestore, newSettings, activeBotId ?? undefined);
        } catch (error) {
            console.error("Failed to save theme settings:", error);
            const oldSettings = await getThemeSettings(firestore, activeBotId ?? undefined);
            setTheme(oldSettings || DEFAULT_THEME);
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: 'Impossibile salvare le impostazioni del tema.',
            });
        }
    }, [firestore, theme, toast, activeBotId]);

    const resetTheme = useCallback(async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Firestore non disponibile.' });
            return;
        }
        setTheme(DEFAULT_THEME); // Optimistic update
        try {
            await setThemeSettings(firestore, DEFAULT_THEME, activeBotId ?? undefined);
        } catch (error) {
            console.error("Failed to reset theme settings:", error);
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: 'Impossibile reimpostare le impostazioni del tema.',
            });
        }
    }, [firestore, toast, activeBotId]);


    return (
        <ThemeContext.Provider value={{ theme, isThemeLoading, updateTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};