import { useMemo } from 'react';
import { Bot } from '@/types';
import type { UserData } from '@/firebase/auth/use-user';

export function useUserBots(allBots: Bot[], user: UserData | null) {
    return useMemo(() => {
        if (!user || !allBots.length) return [];
        if (user.role === 'superadmin') return allBots;

        // Admin and operator: only bots in their botId
        return allBots.filter((bot) => user.botId && user.botId === bot.botId);
    }, [user, allBots]);
}
