"use client";

import type { Message, User } from "@/types";
import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isToday, isYesterday, startOfDay } from "date-fns";
import { User as UserIcon, FileText, Bot, Briefcase, StickyNote, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import ImageModal from "@/components/shared/image-modal";
import { Button } from "@/components/ui/button";
import { MessageStatusIcon } from "./message-status-icon";

interface MessageThreadProps {
  messages: Message[];
  agent: User;
  onLoadOlderMessages?: () => void;
  hasMoreMessages?: boolean;
  isLoadingOlderMessages?: boolean;
}

const getDateLabel = (dateString: string): string => {
  const date = parseISO(dateString);
  if (isToday(date)) return "Oggi";
  if (isYesterday(date)) return "Ieri";
  return format(date, "dd/MM/yyyy");
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

const ClickableMessage = ({ text }: { text?: string }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <p className="text-sm whitespace-pre-wrap">
      {lines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {line.split(/(\*.*?\*)/g).map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return <strong key={i}>{part.slice(1, -1)}</strong>;
            }
            return part.split(urlRegex).map((urlPart, j) =>
              urlRegex.test(urlPart) ? (
                <a key={`${i}-${j}`} href={urlPart} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all">
                  {urlPart}
                </a>
              ) : (
                <React.Fragment key={`${i}-${j}`}>{urlPart}</React.Fragment>
              )
            );
          })}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
};

const Timestamp = ({ message, isAgent }: { message: Message; isAgent: boolean }) => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    return (
        <div className="flex items-center justify-end px-4 pb-1 pt-0.5 text-right text-[10px] text-muted-foreground/80">
            {isMounted ? format(parseISO(message.timestamp), "HH:mm") : <Skeleton className="h-2 w-8" />}
            {isAgent && message.status != null && <MessageStatusIcon status={message.status} />}
        </div>
    );
}

const MessageBubble = React.memo(({ message, agent, onImageClick }: { message: Message, agent: User, onImageClick: (url: string) => void }) => {
    const renderMessageContent = () => {
        const isAgent = message.sender.id === agent.id;
        const content = () => {
            switch (message.type) {
                case 'text':
                case 'userInput':
                    return (
                        <div className="px-4 py-2">
                            <ClickableMessage text={message.text} />
                        </div>
                    );
                case 'image':
                    return (
                        <div className="p-1">
                            <button
                                onClick={() => message.imageUrl && onImageClick(message.imageUrl)}
                                className="block relative h-[150px] w-[150px] rounded-md overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                {message.imageUrl && <Image src={message.imageUrl} alt={message.text || 'Immagine allegata'} fill className="object-cover" />}
                            </button>
                            {message.text && (
                               <div className="p-2 pt-1">
                                    <ClickableMessage text={message.text} />
                                </div>
                            )}
                        </div>
                    );
                case 'document':
                     return (
                        <div className="p-4 space-y-2">
                            {message.imageUrl && message.filename && (
                                 <a
                                    href={message.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-background/50 rounded-md hover:bg-background/70 transition-colors"
                                >
                                    <FileText className="h-6 w-6 text-primary" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate text-foreground">{message.filename}</p>
                                      {message.file && (
                                        <p className="text-xs text-muted-foreground">{Math.round(message.file.size / 1024)} KB</p>
                                      )}
                                    </div>
                                </a>
                            )}
                            {message.text && <ClickableMessage text={message.text} />}
                        </div>
                    );
                case 'template':
                    return (
                        <div className="px-4 py-2 space-y-1">
                            <p className="text-sm font-semibold">{message.text}</p>
                            {message.templateBody && (
                               <p className="text-sm border-l-2 border-muted-foreground/50 pl-2 italic text-muted-foreground">{message.templateBody}</p>
                            )}
                        </div>
                    );
                 case 'interactive':
                    return (
                        <div className="px-4 py-2 space-y-2">
                            <ClickableMessage text={message.text} />
                            {isAgent && message.interactive?.action?.buttons && (
                                <div className="flex flex-col gap-2 pt-2">
                                    {message.interactive.action.buttons.map(button => (
                                        <Button key={button.reply.id} variant="outline" size="sm" className="bg-background/50 pointer-events-none">
                                            {button.reply.title}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                case 'flow':
                    return (
                         <div className="px-4 py-2">
                            <p className="text-sm text-muted-foreground italic">{message.text}</p>
                        </div>
                    )
                default:
                    return (
                        <div className="px-4 py-2 space-y-1">
                            <p className="text-sm font-mono">{message.type}</p>
                            <ClickableMessage text={message.text} />
                        </div>
                    );
            }
        };

        return (
          <div>
            {content()}
            <Timestamp message={message} isAgent={isAgent} />
          </div>
        );
    };

    const isAgent = message.sender.id === agent.id;
    
    return (
      <div className={cn("flex items-end gap-3", isAgent ? "justify-end" : "justify-start")}>
        {!isAgent && (<Avatar className="h-8 w-8"><AvatarFallback className="bg-card border"><UserIcon className="h-4 w-4 text-muted-foreground" /></AvatarFallback></Avatar>)}
        <div className={cn(
          "rounded-lg shadow-sm overflow-hidden",
          message.type === 'image' ? 'w-auto' : 'max-w-xs md:max-w-md lg:max-w-lg',
          isAgent ? "bg-sent-message text-sent-message-foreground" : "bg-card border text-card-foreground"
        )}>
          {renderMessageContent()}
        </div>
        {isAgent && (<Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20"><Bot className="h-4 w-4 text-primary" /></AvatarFallback></Avatar>)}
      </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.message.id === nextProps.message.id &&
           prevProps.message.status === nextProps.message.status;
});
MessageBubble.displayName = 'MessageBubble';

type ThreadItem =
  | (Message & { itemType: "message" })
  | { id: string; itemType: "separator"; timestamp: string };

export default function MessageThread({ messages, agent, onLoadOlderMessages, hasMoreMessages, isLoadingOlderMessages }: MessageThreadProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Check if user is within a threshold (e.g., 50px) of the bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsUserAtBottom(atBottom);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);
  
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages]);

  const prevMessagesRef = useRef<Message[]>([]);

  useEffect(() => {
    // Quando i messaggi cambiano completamente (nuova chat), scrolla in basso
    const isNewChat = prevMessagesRef.current.length === 0 || 
      (messages.length > 0 && prevMessagesRef.current[0]?.id !== messages[0]?.id);
    
    if (isNewChat) {
      setIsUserAtBottom(true);
      // Piccolo delay per aspettare il render
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
    prevMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom if the user is already near the bottom
    if (isUserAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [sortedMessages, isUserAtBottom]); // Rerun when messages change and user is at bottom

  const messagesWithSeparators = useMemo(() => {
    return sortedMessages.reduce((acc, message, index) => {
      if (!message || !message.timestamp) return acc;
      
      const currentDate = startOfDay(parseISO(message.timestamp));
      const prevMessage = sortedMessages[index - 1];
      const prevDate = prevMessage?.timestamp ? startOfDay(parseISO(prevMessage.timestamp)) : null;

      if ((message.type !== 'operator' && message.type !== 'operator_note') && (!prevDate || currentDate.getTime() !== prevDate.getTime())) {
        acc.push({
          id: `separator-${currentDate.toISOString()}`,
          itemType: "separator",
          timestamp: message.timestamp,
        });
      }
      acc.push({ ...message, itemType: "message" });
      return acc;
    }, [] as ThreadItem[]);
  }, [sortedMessages]);
  
  const handleOpenModal = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsModalOpen(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImageUrl(null);
  }, []);

  return (
    <>
      <ImageModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        imageUrl={selectedImageUrl}
      />
      <ScrollArea className="h-full" viewportRef={viewportRef}>
        <div className="space-y-4">
          {hasMoreMessages && onLoadOlderMessages && (
            <div className="flex justify-center py-3">
              <Button variant="ghost" size="sm" onClick={onLoadOlderMessages} disabled={isLoadingOlderMessages}>
                {isLoadingOlderMessages && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Carica messaggi precedenti
              </Button>
            </div>
          )}
          {messagesWithSeparators.map((item, index) => {
            if (item.itemType === "separator") {
              return (
                <div key={item.id} className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {isMounted ? getDateLabel(item.timestamp) : <Skeleton className="h-3 w-16" />}
                  </div>
                </div>
              );
            }

            const message = item as Message & { itemType: "message" };

            if (message.type === 'operator') {
                 return (
                    <div key={item.id || `msg-wrapper-${index}`} className="flex justify-center items-center gap-2">
                        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-2">
                          <Briefcase className="h-3 w-3" />
                          <span>
                            {message.operatorData?.name 
                                ? `Chat assegnata a ${message.operatorData.name}`
                                : "Assegnazione rimossa"}
                          </span>
                          <span>-</span>
                           {isMounted ? format(parseISO(message.timestamp), "HH:mm") : <Skeleton className="h-3 w-8" />}
                        </div>
                    </div>
                 );
            }
            
            if (message.type === 'operator_note') {
              return (
                <div key={item.id || `msg-wrapper-${index}`} className="flex justify-center">
                  <div className="w-full max-w-sm mx-auto bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-lg p-3 my-2 text-sm shadow-sm">
                      <div className="flex items-start gap-2">
                          <StickyNote className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex-1">
                              <p className="font-semibold">Nota di {message.sentBy?.firstname || 'Operatore'}</p>
                              <p className="whitespace-pre-wrap">{message.text}</p>
                              <div className="text-right text-xs text-yellow-600 mt-1">
                                {isMounted ? format(parseISO(message.timestamp), "dd/MM/yyyy HH:mm") : <Skeleton className="h-3 w-12" />}
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              );
            }
            
            return (
              <MessageBubble 
                key={message.id || `msg-${index}`} 
                message={message} 
                agent={agent} 
                onImageClick={handleOpenModal} 
              />
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </>
  );
}
