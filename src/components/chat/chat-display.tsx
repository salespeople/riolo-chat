'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { Chat, SendPulseFlow, WhatsAppTemplate, QuickReply, Message } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CardContent, CardHeader } from "@/components/ui/card";
import { User, MessageSquare, AlertTriangle, Loader2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MessageThread from "@/components/messages/message-thread";
import NoteThread from "@/components/notes/note-thread";
import MessageInput from "@/components/messages/message-input";
import NoteInput from "@/components/notes/note-input";
import { agent } from "@/lib/data";
import { formatPhoneNumber, isSupportWindowActive, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { UserProfile } from "@/firebase/auth/use-user";
import { useUser } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ChatInfo from "./chat-info";


type ChatDisplayProps = {
  chat: Omit<Chat, 'messages' | 'messagesLoaded'>;
  messages: Message[];
  isLoadingMessages: boolean;
  onSendMessage: (messageText: string, file?: File) => void;
  onSendTemplate: (template: WhatsAppTemplate) => void;
  onSendFlow: (flow: SendPulseFlow) => void;
  onSendQuickReply: (reply: QuickReply) => void;
  onCloseChat: () => void;
  isClosingChat: boolean;
  onOpenChat: () => void;
  isOpeningChat: boolean;
  operators: UserProfile[];
  isLoadingOperators: boolean;
  onAssignOperator: (operatorId: string | null) => void;
  assignedOperatorUser: UserProfile | null;
  onUpdateChat: (updater: (draft: Chat) => void) => void;
  onAddNote: (noteText: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onUpdateNote: (noteId: string, text: string) => Promise<void>;
  onLoadOlderMessages?: () => void;
  hasMoreMessages?: boolean;
  isLoadingOlderMessages?: boolean;
}

const ChatHeader = React.memo(({
  chat,
  phoneNumber,
  isLoadingOperators,
  assignedOperatorUser,
  operators,
  onAssignOperator,
  onCloseChat,
  isClosingChat,
  onOpenChat,
  isOpeningChat
}: {
  chat: Omit<Chat, 'messages' | 'messagesLoaded'>,
  phoneNumber: string,
  isLoadingOperators: boolean,
  assignedOperatorUser: UserProfile | null,
  operators: UserProfile[],
  onAssignOperator: (operatorId: string | null) => void,
  onCloseChat: () => void,
  isClosingChat: boolean,
  onOpenChat: () => void,
  isOpeningChat: boolean,
}) => {
  return (
    <CardHeader className="hidden md:flex flex-row items-center justify-between border-b p-4">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{chat.user.name}</p>
          <p className="text-sm text-muted-foreground">- {phoneNumber}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={assignedOperatorUser ? 'icon' : 'sm'} disabled={isLoadingOperators} className={assignedOperatorUser ? "h-9 w-9 rounded-full" : ""}>
              {isLoadingOperators ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : assignedOperatorUser ? (
                <Avatar className="h-8 w-8 text-xs">
                  <AvatarFallback style={{ backgroundColor: assignedOperatorUser.color || 'hsl(var(--primary))' }} className="text-primary-foreground">
                    {getInitials(assignedOperatorUser.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                "Assegna"
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Assegna operatore</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {operators.length > 0 ? (
              <>
                {operators.map((operator) => (
                  <DropdownMenuItem key={operator.uid} onSelect={() => onAssignOperator(operator.operatorId || null)}>
                    {operator.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onAssignOperator(null)} className="text-destructive">
                  Rimuovi assegnazione
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>Nessun operatore trovato</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {chat.isChatOpened ? (
          <Button variant="destructive" size="sm" onClick={onCloseChat} disabled={isClosingChat}>
            {isClosingChat ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chiusura...
              </>
            ) : (
              'Chiudi chat'
            )}
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={onOpenChat} disabled={isOpeningChat}>
            {isOpeningChat ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Apertura...
              </>
            ) : (
              'Apri chat'
            )}
          </Button>
        )}
      </div>
    </CardHeader>
  )
});
ChatHeader.displayName = 'ChatHeader';

const MemoizedNoteInput = React.memo(NoteInput);

const ChatInputArea = React.memo(({
  botId,
  activeTab,
  onTabChange,
  onSendMessage,
  onSendTemplate,
  onSendFlow,
  onSendQuickReply,
  isInputDisabled,
  onAddNote
}: {
  botId: string | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSendMessage: (text: string, file?: File) => void;
  onSendTemplate: (template: WhatsAppTemplate) => void;
  onSendFlow: (flow: SendPulseFlow) => void;
  onSendQuickReply: (reply: QuickReply) => void;
  isInputDisabled: boolean;
  onAddNote: (noteText: string) => Promise<void>;
}) => {

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [botId]); // Focus when chat changes

  const handleChatAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      textareaRef.current &&
      !target.closest('a, button, input, textarea, [role="button"], [role="combobox"], [role="tab"]')
    ) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="border-t p-2 bg-muted/30" onClick={handleChatAreaClick}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="bg-transparent p-0 h-auto mb-2 border-b-0">
          <TabsTrigger
            value="messages"
            className="text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none p-1 shadow-none bg-transparent data-[state=active]:shadow-none"
          >
            Invia un messaggio
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none p-1 shadow-none bg-transparent data-[state=active]:shadow-none"
          >
            Nota
          </TabsTrigger>
        </TabsList>
        <TabsContent value="messages" className="mt-0 w-full">
          <MessageInput
            ref={textareaRef}
            botId={botId}
            onSendMessage={onSendMessage}
            onSendTemplate={onSendTemplate}
            onSendFlow={onSendFlow}
            onSendQuickReply={onSendQuickReply}
            isWindowExpired={isInputDisabled}
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-0 w-full">
          <MemoizedNoteInput onAddNote={onAddNote} />
        </TabsContent>
      </Tabs>
    </div>
  );
});
ChatInputArea.displayName = 'ChatInputArea';

const ChatDisplay = ({
  chat,
  messages,
  isLoadingMessages,
  onSendMessage,
  onSendTemplate,
  onSendFlow,
  onSendQuickReply,
  onCloseChat,
  isClosingChat,
  onOpenChat,
  isOpeningChat,
  operators,
  isLoadingOperators,
  onAssignOperator,
  assignedOperatorUser,
  onAddNote,
  onDeleteNote,
  onUpdateNote,
  onLoadOlderMessages,
  hasMoreMessages,
  isLoadingOlderMessages,
}: ChatDisplayProps) => {

  const [isWindowActive, setIsWindowActive] = useState(true);
  const [activeTab, setActiveTab] = useState("messages");
  const { toast } = useToast();
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const { user: currentUser } = useUser();

  const operatorNotes = useMemo(() => {
    return messages
      .filter(m => m.type === 'operator_note')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages]);


  useEffect(() => {
    if (chat) {
      const checkWindow = () => setIsWindowActive(isSupportWindowActive(chat.lastActivityAt));
      checkWindow();
      const interval = setInterval(checkWindow, 1000 * 60);
      return () => clearInterval(interval);
    } else {
      setIsWindowActive(false);
    }
  }, [chat]);

  useEffect(() => {
    setActiveTab("messages");
  }, [chat?.id]);

  const handleAddNote = async (noteText: string) => {
    if (!chat || !noteText.trim() || !currentUser) return;
    await onAddNote(noteText);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!chat) return;
    setDeletingNoteId(noteId);
    await onDeleteNote(noteId);
    setDeletingNoteId(null);
  };

  const handleEditNote = (note: Message) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text || "");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleSaveNote = async (noteId: string) => {
    if (!chat || !editingNoteText.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il testo della nota non può essere vuoto.' });
      return;
    }
    await onUpdateNote(noteId, editingNoteText);
    setEditingNoteId(null);
    setEditingNoteText("");
  };


  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card p-4 text-center">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Seleziona una chat per iniziare</h2>
        <p className="mt-1 text-muted-foreground">
          Scegli un contatto dalla lista a sinistra per visualizzare la conversazione e iniziare a comunicare.
        </p>
      </div>
    );
  }

  const phoneNumber = formatPhoneNumber(chat.user.id);
  const isInputDisabled = !isWindowActive;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        chat={chat}
        phoneNumber={phoneNumber}
        isLoadingOperators={isLoadingOperators}
        assignedOperatorUser={assignedOperatorUser}
        operators={operators}
        onAssignOperator={onAssignOperator}
        onCloseChat={onCloseChat}
        isClosingChat={isClosingChat}
        onOpenChat={onOpenChat}
        isOpeningChat={isOpeningChat}
      />

      {!chat.isChatOpened && (
        <div className="flex items-center gap-3 border-b bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          <Info className="h-5 w-5 text-red-500 shrink-0" />
          <p className="font-semibold">Questa chat è chiusa</p>
        </div>
      )}

      {!isWindowActive && (
        <div className="flex items-center gap-3 border-b bg-amber-100 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Finestra di supporto scaduta</p>
            <p className="text-xs">Non è possibile inviare messaggi diretti. Seleziona un template da inviare.</p>
          </div>
        </div>
      )}

      <CardContent className="flex-1 overflow-auto bg-chat-bg p-4">
        {isLoadingMessages && messages.length === 0 ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`flex items-end gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"
                  }`}
              >
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <Skeleton className={`h-16 w-${i % 2 === 0 ? "48" : "32"} rounded-lg`} />
              </div>
            ))}
          </div>
        ) : activeTab === 'messages' ? (
          <MessageThread messages={messages} agent={agent} onLoadOlderMessages={onLoadOlderMessages} hasMoreMessages={hasMoreMessages} isLoadingOlderMessages={isLoadingOlderMessages} />
        ) : (
          <NoteThread
            notes={operatorNotes}
            isLoading={false}
            onDeleteNote={handleDeleteNote}
            deletingNoteId={deletingNoteId}
            editingNoteId={editingNoteId}
            editingText={editingNoteText}
            onEditingTextChange={setEditingNoteText}
            onEditNote={handleEditNote}
            onSaveNote={handleSaveNote}
            onCancelEdit={handleCancelEdit}
          />
        )}
      </CardContent>

      <ChatInputArea
        botId={chat.botId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSendMessage={onSendMessage}
        onSendTemplate={onSendTemplate}
        onSendFlow={onSendFlow}
        onSendQuickReply={onSendQuickReply}
        isInputDisabled={isInputDisabled}
        onAddNote={handleAddNote}
      />
    </div>
  );
};
ChatDisplay.displayName = "ChatDisplay";

export default React.memo(ChatDisplay);
