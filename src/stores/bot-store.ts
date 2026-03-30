import { create } from 'zustand';
import { Bot } from '@/types';

interface BotStore {
    bots: Bot[];
    activeBotId: string | null;
    setBots: (bots: Bot[]) => void;
    setActiveBotId: (id: string | null) => void;
    getBotById: (botId: string) => Bot | null;
}

export const useBotStore = create<BotStore>((set, get) => ({
    bots: [],
    activeBotId: null,
    setBots: (bots) => set({ bots }),
    setActiveBotId: (id) => set({ activeBotId: id }),
    getBotById: (botId) => get().bots.find((b) => b.botId === botId) || null,
}));
