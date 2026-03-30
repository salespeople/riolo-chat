import { useMemo } from 'react';
import { Bot } from '@/types';
import type { UserData } from '@/firebase/auth/use-user';

export function useUserBots(allBots: Bot[], user: UserData | null) {
    return useMemo(() => {
        if (!user || !allBots.length) return [];
        if (user.role === 'superadmin') return allBots;
        
        // Admin and operator: only bots in their botIds
        return allBots.filter((bot) => user.botIds && user.botIds.includes(bot.botId));
    }, [user, allBots]);
}
