import { useMemo } from 'react';
import { Bot } from '@/types';
import type { UserData } from '@/firebase/auth/use-user';

/** Normalizes botId (string | string[] | undefined) into an array of strings. */
function normalizeBotIds(botId: string | string[] | undefined): string[] {
    if (!botId) return [];
    if (Array.isArray(botId)) return botId.filter(Boolean);
    return botId ? [botId] : [];
}

export function useUserBots(allBots: Bot[], user: UserData | null) {
    return useMemo(() => {
        if (!user || !allBots.length) return [];
        if (user.role === 'superadmin') return allBots;

        const userBotIds = normalizeBotIds(user.botId);
        if (userBotIds.length === 0) return [];

        return allBots.filter((bot) => userBotIds.includes(bot.botId));
    }, [user, allBots]);
}
