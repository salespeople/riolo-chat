'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ThemeSettings } from '@/types';
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { activeBotId, bots } = useBotStore();
    const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
    const [isThemeLoading, setIsThemeLoading] = useState(true);

    useEffect(() => {
        if (bots.length === 0) {
            setIsThemeLoading(false);
            return;
        }

        const activeBot = activeBotId
            ? bots.find(b => b.botId === activeBotId)
            : bots[0]; // Fallback al primo bot

        if (activeBot) {
            setTheme({
                primaryColor: activeBot.headerColor || DEFAULT_THEME.primaryColor,
                accentColor: DEFAULT_THEME.accentColor,
                headerName: activeBot.headerTitle || activeBot.name || DEFAULT_THEME.headerName,
                logoUrl: activeBot.logoUrl || DEFAULT_THEME.logoUrl,
                logoEmoji: activeBot.logoEmoji || DEFAULT_THEME.logoEmoji,
            });
        } else {
            setTheme(DEFAULT_THEME);
        }

        setIsThemeLoading(false);
    }, [activeBotId, bots]);

    return (
        <ThemeContext.Provider value={{ theme, isThemeLoading }}>
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
