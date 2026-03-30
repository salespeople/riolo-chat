'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ChatList from "@/components/chat/chat-list";
import ChatDisplay from "@/components/chat/chat-display";
import type { Chat, Message, WhatsAppTemplate, SendPulseFlow, SendPulseBotVariable, SendPulseTag, QuickReply, ChatFilters, Bot } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import ChatInfo from "@/components/chat/chat-info";
import { agent } from "@/lib/data";
import { produce } from "immer";
import { uploadFile } from "@/lib/storage";
import { getChats, sendMessage, sendTemplateMessage, closeChat, openChat, getWhatsappBotVariables, getWhatsappTags, assignContactToOperator, fetchNextChatPage, getMessagesForChat, loadOlderMessages, markChatAsRead, addContactNote, deleteContactNote, updateContactNote } from "@/lib/sendpulse";
import { useFirebaseApp, useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/firebase/auth/use-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/layout/theme-provider";

const MobileHeader = ({
    selectedChatId,
    setSelectedChatId,
    selectedChat,
    bots,
    botVariables,
    allTags,
    handleUpdateChat
}: {
    selectedChatId: string | null;
    setSelectedChatId: (id: string | null) => void;
    selectedChat: Chat | null;
    bots: Bot[];
    botVariables: SendPulseBotVariable[];
    allTags: SendPulseTag[];
    handleUpdateChat: (updater: (draft: Chat) => void) => void;
}) => (
    <div className="md:hidden h-16 flex items-center justify-between px-4 border-b">
        {selectedChatId ? (
            <>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedChatId(null); }}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="font-semibold">{selectedChat?.user.name}</div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Info className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="p-0">
                        <ChatInfo
                            chat={selectedChat}
                            botVariables={botVariables}
                            allTags={allTags}
                            isLoading={false}
                            onUpdateChat={handleUpdateChat}
                        />
                    </SheetContent>
                </Sheet>
            </>
        ) : (
            <div className="font-semibold text-lg">{bots[0]?.name || 'Chat'}</div>
        )}
    </div>
);

const MainContent = ({
    isMobile,
    selectedChatId,
    chatsWithOperatorDetails,
    handleSelectChat,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    operators,
    currentUser,
    handleLoadMore,
    isLoadingMore,
    handleManualRefresh,
    isRefreshing,
    isChatColumnVisible,
    selectedChat,
    activeChatMessages,
    isLoadingMessages,
    handleSendMessage,
    handleSendTemplate,
    handleSendFlow,
    handleSendQuickReply,
    handleCloseChat,
    isClosingChat,
    handleOpenChat,
    isOpeningChat,
    isLoadingUsers,
    handleAssignOperator,
    assignedOperatorUser,
    handleUpdateChat,
    handleAddNote,
    handleDeleteNote,
    handleUpdateNote,
    botVariables,
    allTags,
    handleLoadOlderMessages,
    hasMoreMessages,
    isLoadingOlderMessages,
}: {
    isMobile: boolean;
    selectedChatId: string | null;
    chatsWithOperatorDetails: (Chat & { assignedOperator: UserProfile | null; })[];
    handleSelectChat: (chatId: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filters: ChatFilters;
    setFilters: React.Dispatch<React.SetStateAction<ChatFilters>>;
    operators: UserProfile[];
    currentUser: UserProfile | null;
    handleLoadMore: () => void;
    isLoadingMore: boolean;
    handleManualRefresh: () => void;
    isRefreshing: boolean;
    isChatColumnVisible: boolean;
    selectedChat: Chat | null;
    activeChatMessages: Message[];
    isLoadingMessages: boolean;
    handleSendMessage: (text: string, file?: File) => void;
    handleSendTemplate: (template: WhatsAppTemplate) => void;
    handleSendFlow: (flow: SendPulseFlow) => void;
    handleSendQuickReply: (reply: QuickReply) => void;
    handleCloseChat: () => void;
    isClosingChat: boolean;
    handleOpenChat: () => void;
    isOpeningChat: boolean;
    isLoadingUsers: boolean;
    handleAssignOperator: (operatorId: string | null) => void;
    assignedOperatorUser: UserProfile | null;
    handleUpdateChat: (updater: (draft: Chat) => void) => void;
    handleAddNote: (noteText: string) => Promise<void>;
    handleDeleteNote: (noteId: string) => Promise<void>;
    handleUpdateNote: (noteId: string, text: string) => Promise<void>;
    botVariables: SendPulseBotVariable[];
    allTags: SendPulseTag[];
    handleLoadOlderMessages: () => void;
    hasMoreMessages: boolean;
    isLoadingOlderMessages: boolean;
}) => (
    <main className="h-full flex">
        <div className={cn(
            "h-full w-full md:w-[320px] lg:w-[380px] shrink-0 border-r bg-card",
            isMobile && selectedChatId && "hidden",
            isMobile && !selectedChatId && "w-full"
        )}>
            <ChatList
                chats={chatsWithOperatorDetails}
                selectedChatId={selectedChatId}
                onSelectChat={handleSelectChat}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filters={filters}
                setFilters={setFilters}
                operators={operators}
                currentUser={currentUser}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                onRefresh={handleManualRefresh}
                isRefreshing={isRefreshing}
            />
        </div>

        <div className={cn("flex-1 h-full", !isChatColumnVisible && "hidden md:flex")}>
            {selectedChat ? (
                <div className="h-full flex">
                    <div className="flex-1 h-full">
                        <ChatDisplay
                            key={selectedChat.id}
                            chat={selectedChat}
                            messages={activeChatMessages}
                            isLoadingMessages={isLoadingMessages}
                            onSendMessage={handleSendMessage}
                            onSendTemplate={handleSendTemplate}
                            onSendFlow={handleSendFlow}
                            onSendQuickReply={handleSendQuickReply}
                            onCloseChat={handleCloseChat}
                            isClosingChat={isClosingChat}
                            onOpenChat={handleOpenChat}
                            isOpeningChat={isOpeningChat}
                            operators={operators}
                            isLoadingOperators={isLoadingUsers}
                            onAssignOperator={handleAssignOperator}
                            assignedOperatorUser={assignedOperatorUser}
                            onUpdateChat={handleUpdateChat}
                            onAddNote={handleAddNote}
                            onDeleteNote={handleDeleteNote}
                            onUpdateNote={handleUpdateNote}
                            onLoadOlderMessages={handleLoadOlderMessages}
                            hasMoreMessages={hasMoreMessages}
                            isLoadingOlderMessages={isLoadingOlderMessages}
                        />
                    </div>
                    <div className="w-[300px] lg:w-[350px] shrink-0 h-full hidden lg:block">
                        <ChatInfo
                            chat={selectedChat}
                            botVariables={botVariables}
                            allTags={allTags}
                            isLoading={false}
                            onUpdateChat={handleUpdateChat}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex h-full flex-col items-center justify-center bg-card p-4 text-center">
                    <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
                    <h2 className="mt-4 text-xl font-semibold">Seleziona una chat per iniziare</h2>
                    <p className="mt-1 text-muted-foreground">
                        Scegli un contatto dalla lista a sinistra per visualizzare la conversazione e iniziare a comunicare.
                    </p>
                </div>
            )}
        </div>
    </main>
);

export default function ChatLayout() {
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [activeChatMessages, setActiveChatMessages] = useState<Message[]>([]);

    const allChatsRef = useRef(allChats);
    allChatsRef.current = allChats;

    const [nextLinks, setNextLinks] = useState<Record<string, string | null>>({});

    const [bots, setBots] = useState<Bot[]>([]);
    const [botVariables, setBotVariables] = useState<SendPulseBotVariable[]>([]);
    const [allTags, setAllTags] = useState<SendPulseTag[]>([]);

    const [filters, setFilters] = useState<ChatFilters>({
        status: "all",
        read: "all",
        assignment: "all",
        operatorId: null,
        sort: "recent",
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingInitialChats, setIsLoadingInitialChats] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingRef = useRef(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    const [isClosingChat, setIsClosingChat] = useState(false);
    const [isOpeningChat, setIsOpeningChat] = useState(false);

    const { toast } = useToast();
    const firebaseApp = useFirebaseApp();
    const auth = useAuth();
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const { isThemeLoading } = useTheme();
    const isMobile = useIsMobile();
    const [isChatColumnVisible, setIsChatColumnVisible] = useState(false);

    const selectedChatIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedChatIdRef.current = selectedChatId;
    }, [selectedChatId]);

    const appInstanceId = process.env.NEXT_PUBLIC_APP_INSTANCE_ID;

    const usersCollection = useMemoFirebase(() => {
        if (firestore) {
            return collection(firestore, 'users');
        }
        return null;
    }, [firestore]);

    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersCollection);
    const allUsersRef = useRef(allUsers);
    allUsersRef.current = allUsers;

    const botsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bots') : null, [firestore]);
    const { data: botsData, isLoading: isLoadingBots } = useCollection<Bot>(botsCollection);

    const selectedChat = useMemo(() => {
        return allChats.find(c => c.id === selectedChatId) || null;
    }, [allChats, selectedChatId]);


    useEffect(() => {
        if (botsData) {
            setBots(botsData);
        }
    }, [botsData]);


    const operators = useMemo(() => {
        if (!allUsers || !appInstanceId) return [];
        return allUsers.filter(user =>
            user.role === 'operator' &&
            user.operatorId &&
            Array.isArray(user.instanceId) &&
            user.instanceId.includes(appInstanceId)
        );
    }, [allUsers, appInstanceId]);


    useEffect(() => {
        if (isMobile) {
            setIsChatColumnVisible(!!selectedChatId);
        } else {
            setIsChatColumnVisible(true);
        }
    }, [selectedChatId, isMobile]);

    const refreshChatList = useCallback(async (isManualRefresh = false) => {
        if (isRefreshingRef.current) {
            if (!isManualRefresh) console.log("⏸️ Refresh già in corso, skip.");
            return;
        }
        isRefreshingRef.current = true;
        if (isManualRefresh) setIsRefreshing(true);

        if (!isManualRefresh) console.log("🔄 Trigger ricevuto, aggiorno la lista chat...");
        try {
            const { chats: newChats, nextLinks: newNextLinks } = await getChats();

            setAllChats(prevChats => {
                const activeChat = selectedChatIdRef.current ? prevChats.find(c => c.id === selectedChatIdRef.current) : null;
                const chatMap = new Map(prevChats.map(chat => [chat.id, chat]));

                newChats.forEach(newChat => {
                    const existingChat = chatMap.get(newChat.id);
                    if (existingChat) {
                        if (existingChat.id === activeChat?.id && existingChat.messagesLoaded) {
                            chatMap.set(newChat.id, {
                                ...newChat,
                                messages: existingChat.messages,
                                messagesLoaded: existingChat.messagesLoaded,
                            });
                        } else {
                            chatMap.set(newChat.id, { ...existingChat, ...newChat });
                        }
                    } else {
                        chatMap.set(newChat.id, newChat);
                    }
                });
                return Array.from(chatMap.values()).sort((a, b) =>
                    new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
                );
            });

            setNextLinks(newNextLinks);
            if (isManualRefresh) {
                toast({ title: 'Chat aggiornate' });
            }
        } catch (error) {
            console.error('❌ Errore refresh lista chat:', error);
            if (isManualRefresh) {
                toast({ variant: 'destructive', title: 'Errore', description: 'Errore nel caricamento delle chat' });
            }
        } finally {
            if (isManualRefresh) setIsRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [toast]);

    const refreshActiveChatMessages = useCallback(async (chatId: string) => {
        const chat = allChatsRef.current.find(c => c.id === chatId);
        if (!chat) return;

        console.log(`🔄 Aggiornamento in background per la chat attiva: ${chatId}`);

        try {
            const { messages: fetchedMessages } = await getMessagesForChat(chat.botId, chat.contactId, chat.user);

            setActiveChatMessages(currentMessages => {
                const messageMap = new Map(currentMessages.map(m => [m.id, m]));
                fetchedMessages.forEach(msg => {
                    messageMap.set(msg.id, msg);
                });

                return Array.from(messageMap.values()).sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
            });

            // Mark as read in background and update unread count in UI
            await markChatAsRead(chat.botId, chat.contactId);
            setAllChats(prevChats => produce(prevChats, draft => {
                const chatToUpdate = draft.find(c => c.id === chatId);
                if (chatToUpdate) {
                    chatToUpdate.unreadCount = 0;
                }
            }));

        } catch (error) {
            console.error('Errore durante l\'aggiornamento in background della chat attiva:', error);
            // Non mostrare un toast per non essere invasivi
        }
    }, []);

    useEffect(() => {
        const initialLoad = async () => {
            setIsLoadingInitialChats(true);
            await refreshChatList(true);
            setIsLoadingInitialChats(false);
        };

        initialLoad();

        if (!firestore) return;

        const triggerDocRef = doc(firestore, 'realtime_updates', 'global_trigger');
        let isFirstSnapshot = true;

        const unsubscribe = onSnapshot(triggerDocRef, (doc) => {
            // Ignora la prima lettura automatica all'avvio del listener
            if (isFirstSnapshot) {
                isFirstSnapshot = false;
                return;
            }

            // Ignora gli aggiornamenti provenienti dalla cache locale per evitare loop
            if (doc.metadata.fromCache) {
                console.log("Trigger dalla cache, refresh saltato.");
                return;
            }

            console.log("Trigger in tempo reale ricevuto, avvio aggiornamento...");

            // 1. Aggiorna la lista chat in background
            refreshChatList(false);

            // 2. Se una chat è aperta, aggiorna anche i suoi messaggi in background
            if (selectedChatIdRef.current) {
                refreshActiveChatMessages(selectedChatIdRef.current);
            }
        });

        // Pulisci il listener quando il componente viene smontato
        return () => unsubscribe();
    }, [firestore, refreshChatList, refreshActiveChatMessages]);


    const handleManualRefresh = useCallback(async () => {
        await refreshChatList(true);
    }, [refreshChatList]);


    const handleLoadMore = useCallback(async () => {
        setIsLoadingMore(true);
        try {
            const fetchPromises = Object.entries(nextLinks)
                .filter(([_, url]) => url !== null)
                .map(([botId, url]) => {
                    const bot = bots.find(b => b.id === botId);
                    if (bot && url) {
                        return fetchNextChatPage(url, bot);
                    }
                    return Promise.resolve(null);
                });

            const results = await Promise.all(fetchPromises);

            let newChats: Chat[] = [];
            const newNextLinks = { ...nextLinks };

            results.forEach(result => {
                if (result) {
                    newChats = [...newChats, ...result.chats];
                    newNextLinks[result.botId] = result.nextLink;
                }
            });

            if (newChats.length > 0) {
                setAllChats(prevChats => [...prevChats, ...newChats]);
            }
            setNextLinks(newNextLinks);

        } catch (error) {
            console.error("Failed to load more chats:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare altre chat." });
        } finally {
            setIsLoadingMore(false);
        }
    }, [nextLinks, bots, toast]);


    useEffect(() => {
        const fetchInitialBotData = async () => {
            if (bots.length > 0) {
                const allBotVariablesPromises = bots.map(bot => getWhatsappBotVariables(bot.id));
                const allTagsPromises = bots.map(bot => getWhatsappTags(bot.id));

                const [variablesArrays, tagsArrays] = await Promise.all([
                    Promise.all(allBotVariablesPromises),
                    Promise.all(allTagsPromises)
                ]);

                const flatVariables = variablesArrays.flat();
                const uniqueVariables = Array.from(new Map(flatVariables.map(item => [item.name, item])).values());
                setBotVariables(uniqueVariables);

                const flatTags = tagsArrays.flat();
                const uniqueTags = Array.from(new Map(flatTags.map(item => [item.name, item])).values());
                setAllTags(uniqueTags);
            }
        };
        fetchInitialBotData();
    }, [bots]);


    const filteredAndSortedChats = useMemo(() => {
        let intermediateChats = [...allChats];

        if (filters.status !== 'all') {
            intermediateChats = intermediateChats.filter(chat =>
                filters.status === 'open' ? chat.isChatOpened : !chat.isChatOpened
            );
        }

        if (filters.read !== 'all') {
            intermediateChats = intermediateChats.filter(chat => {
                const isUnread = chat.isChatOpened && chat.unreadCount > 0;
                return filters.read === 'unread' ? isUnread : !isUnread;
            });
        }

        switch (filters.assignment) {
            case 'assigned_to_me':
                if (currentUser?.operatorId) {
                    intermediateChats = intermediateChats.filter(chat => chat.details?.operator?.user_id?.toString() === currentUser.operatorId);
                } else {
                    intermediateChats = [];
                }
                break;
            case 'assigned_to_operator':
                if (filters.operatorId) {
                    intermediateChats = intermediateChats.filter(chat => chat.details?.operator?.user_id?.toString() === filters.operatorId);
                }
                break;
            case 'unassigned':
                intermediateChats = intermediateChats.filter(chat => !chat.details?.operator);
                break;
            case 'all':
            default:
                break;
        }

        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (trimmedQuery) {
            const searchTerms = trimmedQuery.split(/\s+/);
            intermediateChats = intermediateChats.filter((chat) => {
                if (!chat.user || !chat.lastMessageTimestamp) {
                    return false;
                }
                return searchTerms.every(term => {
                    const nameMatch = chat.user.name?.toLowerCase().includes(term);
                    const phoneMatch = chat.user.id.includes(term);
                    const dateMatch = chat.lastMessageTimestamp.toLowerCase().includes(term);
                    return nameMatch || phoneMatch || dateMatch;
                });
            });
        }

        intermediateChats.sort((a, b) => {
            const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
            const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
            return filters.sort === 'recent' ? timeB - timeA : timeA - timeB;
        });

        return intermediateChats;
    }, [allChats, searchQuery, filters, currentUser]);


    const chatsWithOperatorDetails = useMemo(() => {
        if (!allUsers) {
            return filteredAndSortedChats.map(chat => ({ ...chat, assignedOperator: null }));
        }

        const usersByOperatorId = new Map(allUsers.map(u => [u.operatorId, u]));

        return filteredAndSortedChats.map(chat => {
            const operatorId = chat.details?.operator?.user_id;
            const assignedOperator = operatorId ? usersByOperatorId.get(String(operatorId)) : null;
            return {
                ...chat,
                assignedOperator: assignedOperator || null,
            };
        });
    }, [filteredAndSortedChats, allUsers]);


    const assignedOperatorUser = useMemo(() => {
        if (!selectedChat?.details?.operator?.user_id || !allUsers) {
            return null;
        }
        return allUsers.find(u => u.operatorId === String(selectedChat.details!.operator!.user_id)) || null;
    }, [selectedChat, allUsers]);

    const loadMessagesForChat = useCallback(async (chatId: string) => {
        const chat = allChatsRef.current.find(c => c.id === chatId);
        if (!chat) return;
        console.log(`📥 Caricamento messaggi per chat: ${chatId}`);

        setIsLoadingMessages(true);
        setHasMoreMessages(false);
        try {
            const { messages: fetchedMessages, hasMore } = await getMessagesForChat(chat.botId, chat.contactId, chat.user);
            setActiveChatMessages(fetchedMessages);
            setHasMoreMessages(hasMore);
            console.log(`✅ Messaggi caricati: ${fetchedMessages.length}, altri disponibili: ${hasMore}`);

            setAllChats(prevChats => produce(prevChats, draft => {
                const chatToUpdate = draft.find(c => c.id === chatId);
                if (chatToUpdate) {
                    chatToUpdate.unreadCount = 0;
                }
            }));

            await markChatAsRead(chat.botId, chat.contactId);
        } catch (error) {
            console.error('Error loading messages:', error);
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i messaggi.' });
        } finally {
            setIsLoadingMessages(false);
        }
    }, [toast]);

    const handleLoadOlderMessages = useCallback(async () => {
        if (!selectedChatId || isLoadingOlderMessages || !hasMoreMessages) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        const sortedMessages = [...activeChatMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const oldestMessage = sortedMessages[0];
        if (!oldestMessage) return;

        setIsLoadingOlderMessages(true);
        try {
            const { messages: olderMessages, hasMore } = await loadOlderMessages(
                chat.botId, chat.contactId, chat.user, oldestMessage.id
            );
            if (olderMessages.length > 0) {
                setActiveChatMessages(prev => {
                    const messageMap = new Map(prev.map(m => [m.id, m]));
                    olderMessages.forEach(msg => messageMap.set(msg.id, msg));
                    return Array.from(messageMap.values());
                });
            }
            setHasMoreMessages(hasMore);
        } catch (error) {
            console.error('Error loading older messages:', error);
        } finally {
            setIsLoadingOlderMessages(false);
        }
    }, [selectedChatId, isLoadingOlderMessages, hasMoreMessages, activeChatMessages]);

    const handleSelectChat = useCallback((chatId: string) => {
        console.log(`🎯 Selezione chat: ${chatId}`);
        setSelectedChatId(chatId);
        loadMessagesForChat(chatId);
    }, [loadMessagesForChat]);

    const handleUpdateChat = useCallback((updater: (draft: Chat) => void) => {
        if (!selectedChatId) return;
        setAllChats(produce(draft => {
            const chatToUpdate = draft.find(c => c.id === selectedChatId);
            if (chatToUpdate) {
                updater(chatToUpdate);
            }
        }));
    }, [selectedChatId]);

    const handleSendMessage = useCallback(async (text: string, file?: File) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        const tempMessageId = `temp-${Date.now()}`;
        const isImage = file && file.type.startsWith('image/');
        const isDocument = file && !isImage;
        const messageType = isImage ? 'image' : (isDocument ? 'document' : 'text');

        const optimisticMessage: Message = {
            id: tempMessageId,
            sender: agent,
            text: text || '',
            timestamp: new Date().toISOString(),
            type: messageType,
            file: file,
            imageUrl: file ? URL.createObjectURL(file) : undefined,
            filename: file && isDocument ? file.name : undefined,
            status: 1,
        };

        setActiveChatMessages(prev => [...prev, optimisticMessage]);

        try {
            let response;
            if (file) {
                if (!auth.currentUser) throw new Error("User not authenticated");
                const fileUrl = await uploadFile(firebaseApp, auth, file, `uploads`);
                if (isImage) {
                    response = await sendMessage(chat.botId, chat.contactId, {
                        type: 'image',
                        link: fileUrl,
                        caption: text,
                    });
                } else {
                    response = await sendMessage(chat.botId, chat.contactId, {
                        type: 'document',
                        link: fileUrl,
                        caption: text,
                        filename: file.name,
                    });
                }
            } else {
                response = await sendMessage(chat.botId, chat.contactId, {
                    type: 'text',
                    text: text
                });
            }

            if (!response.success) {
                throw new Error(response.error || "API error on send message");
            }

            setActiveChatMessages(prev => prev.map(m =>
                m.id === tempMessageId ? { ...m, status: 2 } : m
            ));

        } catch (error) {
            console.error("❌ Invio messaggio fallito:", error);
            setActiveChatMessages(prev => prev.map(m =>
                m.id === tempMessageId ? { ...m, status: 6 } : m
            ));
            toast({ variant: "destructive", title: "Error", description: "Message failed to send." });
        }
    }, [selectedChatId, auth, firebaseApp, toast]);

    const handleSendQuickReply = useCallback(async (reply: QuickReply) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        const tempMessageId = `temp-qr-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempMessageId,
            sender: agent,
            text: reply.content,
            timestamp: new Date().toISOString(),
            type: reply.type,
            imageUrl: reply.type === 'image' ? reply.attachment || undefined : undefined,
            filename: reply.type === 'document' ? reply.attachmentName || undefined : undefined,
            status: 1, // Sending
        };

        setActiveChatMessages(prev => [...prev, optimisticMessage]);

        try {
            let response;
            if (reply.type === 'text') {
                response = await sendMessage(chat.botId, chat.contactId, { type: 'text', text: reply.content });
            } else if (reply.type === 'image' && reply.attachment) {
                response = await sendMessage(chat.botId, chat.contactId, {
                    type: 'image',
                    link: reply.attachment,
                    caption: reply.content,
                });
            } else if (reply.type === 'document' && reply.attachment) {
                response = await sendMessage(chat.botId, chat.contactId, {
                    type: 'document',
                    link: reply.attachment,
                    caption: reply.content,
                    filename: reply.attachmentName || 'document',
                });
            } else {
                throw new Error("Invalid quick reply format or missing attachment.");
            }

            if (!response.success) {
                throw new Error(response.error || "API error on send quick reply");
            }

            setActiveChatMessages(prev => prev.map(m =>
                m.id === tempMessageId ? { ...m, status: 2 } : m // Sent
            ));

        } catch (error) {
            console.error("Failed to send quick reply:", error);
            toast({ variant: "destructive", title: "Error", description: "Quick reply failed to send." });

            setActiveChatMessages(prev => prev.map(m =>
                m.id === tempMessageId ? { ...m, status: 6 } : m // Rejected/Failed
            ));
        }
    }, [selectedChatId, toast]);

    const handleSendTemplate = useCallback(async (template: WhatsAppTemplate) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        try {
            const response = await sendTemplateMessage(chat.botId, chat.contactId, template);
            if (!response.success) {
                throw new Error(response.error || "API error on send template");
            }
            toast({ title: 'Template inviato', description: `Il template "${template.name}" è stato inviato con successo.` });

        } catch (error) {
            console.error("Failed to send template:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile inviare il template." });
        }
    }, [selectedChatId, toast]);

    const handleSendFlow = useCallback(async (flow: SendPulseFlow) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        toast({
            title: "Invio Flow (Simulato)",
            description: `Invio del flow "${flow.name}"...`,
        });

        console.log(`Sending flow ${flow.id} to contact ${chat.contactId}`);
    }, [selectedChatId, toast]);

    const handleContactAdded = useCallback(async () => {
        await handleManualRefresh();
    }, [handleManualRefresh]);

    const handleCloseChat = useCallback(async () => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        setIsClosingChat(true);
        try {
            const success = await closeChat(chat.botId, chat.contactId);
            if (success) {
                toast({ title: "Chat chiusa", description: "La chat è stata contrassegnata come chiusa." });
                handleUpdateChat(draft => { draft.isChatOpened = false; });
            } else {
                throw new Error("API call to close chat failed.");
            }
        } catch (error) {
            console.error("Failed to close chat:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile chiudere la chat." });
        } finally {
            setIsClosingChat(false);
        }
    }, [selectedChatId, toast, handleUpdateChat]);

    const handleOpenChat = useCallback(async () => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        setIsOpeningChat(true);
        try {
            const success = await openChat(chat.botId, chat.contactId);
            if (success) {
                toast({ title: "Chat aperta", description: "La chat è stata contrassegnata come aperta." });
                handleUpdateChat(draft => { draft.isChatOpened = true; });
            } else {
                throw new Error("API call to open chat failed.");
            }
        } catch (error) {
            console.error("Failed to open chat:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile aprire la chat." });
        } finally {
            setIsOpeningChat(false);
        }
    }, [selectedChatId, toast, handleUpdateChat]);

    const handleAssignOperator = useCallback(async (operatorId: string | null) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        const result = await assignContactToOperator(chat.botId, chat.contactId, operatorId);

        if (result.success) {
            const allUsers = allUsersRef.current;
            const operator = allUsers?.find(u => u.operatorId === operatorId) || null;

            handleUpdateChat(draft => {
                if (!draft.details) draft.details = {};
                if (operatorId && operator) {
                    draft.details.operator = {
                        user_id: Number(operator.operatorId),
                        username: operator.name,
                        email: operator.email,
                        avatar: null,
                        created_at: ''
                    };
                } else {
                    draft.details.operator = null;
                }
            });

            toast({
                title: 'Assegnazione aggiornata',
                description: operatorId ? `Chat assegnata a ${operator?.name}.` : 'Assegnazione rimossa.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Errore di assegnazione',
                description: 'Impossibile aggiornare l\'operatore per questa chat.',
            });
        }
    }, [selectedChatId, toast, handleUpdateChat]);

    const handleAddNote = useCallback(async (noteText: string) => {
        if (!selectedChatId || !noteText.trim() || !currentUser) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        try {
            const response = await addContactNote(chat.botId, chat.contactId, noteText);
            if (response.success && response.data) {
                toast({ title: 'Nota aggiunta', description: 'La nota è stata salvata con successo.' });
                setActiveChatMessages(prev => [...prev, response.data]);
            } else {
                throw new Error(response.error || 'Impossibile aggiungere la nota.');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
        }
    }, [selectedChatId, currentUser, toast]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;

        const originalMessages = [...activeChatMessages];
        setActiveChatMessages(prev => prev.filter(m => m.id !== noteId));

        try {
            const response = await deleteContactNote(chat.botId, chat.contactId, noteId);
            if (!response.success) {
                throw new Error(response.error || 'Impossibile eliminare la nota.');
            }
            toast({ title: 'Nota eliminata', description: 'La nota è stata rimossa.' });
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
            setActiveChatMessages(originalMessages);
        }
    }, [selectedChatId, activeChatMessages, toast]);

    const handleUpdateNote = useCallback(async (noteId: string, text: string) => {
        if (!selectedChatId) return;
        const chat = allChatsRef.current.find(c => c.id === selectedChatId);
        if (!chat) return;
        const originalNote = activeChatMessages.find(m => m.id === noteId);
        if (!originalNote) return;

        setActiveChatMessages(prev => prev.map(m => m.id === noteId ? { ...m, text } : m));

        try {
            const response = await updateContactNote(chat.botId, chat.contactId, noteId, text);
            if (!response.success) {
                throw new Error(response.error || 'Impossibile aggiornare la nota.');
            }
            toast({ title: 'Nota aggiornata', description: 'La modifica è stata salvata.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
            setActiveChatMessages(prev => prev.map(m => m.id === noteId ? originalNote : m));
        }
    }, [selectedChatId, activeChatMessages, toast]);

    const isAppLoading = isLoadingInitialChats || isLoadingUsers || isLoadingBots || isThemeLoading;

    if (isAppLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
            <div className={cn("shrink-0", isMobile && "hidden")}>
                <Header onContactAdded={handleContactAdded} bots={bots} />
            </div>

            {isMobile && <MobileHeader
                selectedChatId={selectedChatId}
                setSelectedChatId={setSelectedChatId}
                selectedChat={selectedChat}
                bots={bots}
                botVariables={botVariables}
                allTags={allTags}
                handleUpdateChat={handleUpdateChat}
            />}

            <div className="flex-1 min-h-0">
                <MainContent
                    isMobile={isMobile}
                    selectedChatId={selectedChatId}
                    chatsWithOperatorDetails={chatsWithOperatorDetails}
                    handleSelectChat={handleSelectChat}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filters={filters}
                    setFilters={setFilters}
                    operators={operators}
                    currentUser={currentUser}
                    handleLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                    handleManualRefresh={handleManualRefresh}
                    isRefreshing={isRefreshing}
                    isChatColumnVisible={isChatColumnVisible}
                    selectedChat={selectedChat}
                    activeChatMessages={activeChatMessages}
                    isLoadingMessages={isLoadingMessages}
                    handleSendMessage={handleSendMessage}
                    handleSendTemplate={handleSendTemplate}
                    handleSendFlow={handleSendFlow}
                    handleSendQuickReply={handleSendQuickReply}
                    handleCloseChat={handleCloseChat}
                    isClosingChat={isClosingChat}
                    handleOpenChat={handleOpenChat}
                    isOpeningChat={isOpeningChat}
                    isLoadingUsers={isLoadingUsers}
                    handleAssignOperator={handleAssignOperator}
                    assignedOperatorUser={assignedOperatorUser}
                    handleUpdateChat={handleUpdateChat}
                    handleAddNote={handleAddNote}
                    handleDeleteNote={handleDeleteNote}
                    handleUpdateNote={handleUpdateNote}
                    botVariables={botVariables}
                    allTags={allTags}
                    handleLoadOlderMessages={handleLoadOlderMessages}
                    hasMoreMessages={hasMoreMessages}
                    isLoadingOlderMessages={isLoadingOlderMessages}
                />
            </div>
        </div>
    );
}
