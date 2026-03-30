"use client";

import type { Chat, ChatFilters } from "@/types";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, User, RefreshCw, SortAsc, SortDesc, Filter, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday } from "date-fns";
import { it } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/firebase/auth/use-user";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ChatWithOperator = Chat & {
    assignedOperator: UserProfile | null;
};

interface ChatListProps {
  chats: ChatWithOperator[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: ChatFilters;
  setFilters: React.Dispatch<React.SetStateAction<ChatFilters>>;
  operators: UserProfile[];
  currentUser: UserProfile | null;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const OperatorIndicator = ({ color }: { color: string }) => (
    <svg 
      width="10" 
      height="12" 
      viewBox="0 0 10 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: color }}
      title="Operatore assegnato"
    >
        <path d="M0 0H8C9.10457 0 10 0.89543 10 2V10C10 11.1046 9.10457 12 8 12H0L4 6L0 0Z" fill="currentColor"/>
    </svg>
);


export default function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  operators,
  currentUser,
  onLoadMore,
  isLoadingMore,
  onRefresh,
  isRefreshing,
}: ChatListProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearch = () => {
    setSearchQuery(localSearchQuery);
  };
  
  const handleClearSearch = () => {
    setLocalSearchQuery('');
    setSearchQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  };
  
  const handleFilterChange = <K extends keyof ChatFilters>(key: K, value: ChatFilters[K]) => {
    setFilters(prev => {
        const newFilters = { ...prev, [key]: value };
        if (key === 'assignment' && value !== 'assigned_to_operator') {
            newFilters.operatorId = null;
        }
        return newFilters;
    });
  };

  const formatTimestampDisplay = (timestamp: string) => {
    if (!timestamp) {
      return <Skeleton className="h-3 w-12" />;
    }
    try {
      const date = parseISO(timestamp);
      if (isToday(date)) {
        return format(date, "HH:mm");
      }
      return format(date, "dd/MM/yy");
    } catch (e) {
      return <Skeleton className="h-3 w-12" />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search + Filters */}
      <div className="flex flex-col border-b">
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-grow">
            <Input
              placeholder="Cerca per nome o numero..."
              className="pr-9"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
             {localSearchQuery ? (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    aria-label="Pulisci ricerca"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSearch}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    aria-label="Cerca"
                >
                    <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="shrink-0"
            aria-label="Refresh chats"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full px-4 pb-2">
            <AccordionItem value="filters" className="border-b-0">
                 <AccordionTrigger className="py-2 hover:no-underline">
                   <div className="flex items-center gap-2 text-sm font-semibold">
                     <Filter className="h-4 w-4" />
                     <span>Filtri</span>
                   </div>
                 </AccordionTrigger>
                 <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                              <Label htmlFor="filter-status">Stato</Label>
                              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v as ChatFilters['status'])}>
                                  <SelectTrigger id="filter-status"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="all">Tutte</SelectItem>
                                      <SelectItem value="open">Aperte</SelectItem>
                                      <SelectItem value="closed">Chiuse</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="filter-read">Lettura</Label>
                              <Select value={filters.read} onValueChange={(v) => handleFilterChange('read', v as ChatFilters['read'])}>
                                  <SelectTrigger id="filter-read"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="all">Tutte</SelectItem>
                                      <SelectItem value="read">Lette</SelectItem>
                                      <SelectItem value="unread">Non lette</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <Label htmlFor="filter-assignment">Assegnazione</Label>
                          <div className="grid grid-cols-2 gap-3">
                              <Select value={filters.assignment} onValueChange={(v) => handleFilterChange('assignment', v as ChatFilters['assignment'])}>
                                  <SelectTrigger id="filter-assignment"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="all">Tutti</SelectItem>
                                      <SelectItem value="assigned_to_me" disabled={!currentUser?.operatorId}>Assegnati a me</SelectItem>
                                      <SelectItem value="unassigned">Non assegnati</SelectItem>
                                      <SelectItem value="assigned_to_operator">Assegnati a...</SelectItem>
                                  </SelectContent>
                              </Select>
                              <Select 
                                  value={filters.operatorId || ''} 
                                  onValueChange={(v) => handleFilterChange('operatorId', v)}
                                  disabled={filters.assignment !== 'assigned_to_operator'}
                              >
                                  <SelectTrigger id="filter-operator" disabled={filters.assignment !== 'assigned_to_operator'}>
                                      <SelectValue placeholder="Seleziona operatore" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {operators.map(op => <SelectItem key={op.uid} value={op.operatorId!}>{op.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <Label htmlFor="filter-sort">Ordina per</Label>
                          <Select value={filters.sort} onValueChange={(v) => handleFilterChange('sort', v as ChatFilters['sort'])}>
                              <SelectTrigger id="filter-sort">
                                  <div className="flex items-center gap-2">
                                  {filters.sort === 'recent' ? <SortDesc className="h-4 w-4 text-muted-foreground" /> : <SortAsc className="h-4 w-4 text-muted-foreground" />}
                                  <SelectValue />
                                  </div>
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="recent">Più recenti</SelectItem>
                                  <SelectItem value="oldest">Meno recenti</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-1 p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChat(chat.id);
                }
              }}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 rounded-md p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                chat.id === selectedChatId
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary/90"
              )}
              aria-selected={chat.id === selectedChatId}
            >
              <Avatar className="h-10 w-10 shrink-0 mt-0.5 relative">
                <AvatarFallback>
                  <User className="h-5" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                      {chat.assignedOperator && chat.assignedOperator.color && (
                          <OperatorIndicator color={chat.assignedOperator.color} />
                      )}
                      <p className="truncate font-semibold">{chat.user?.name || chat.user?.id}</p>
                  </div>
                  {chat.lastMessageTimestamp && (
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatTimestampDisplay(chat.lastMessageTimestamp)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="flex-1 truncate text-sm text-muted-foreground">
                    {truncateText(chat.lastMessageSnippet, 30)}
                  </p>
                  {chat.unreadCount > 0 && chat.isChatOpened && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Footer with Load More button */}
      <div className="p-4 text-center border-t h-[65px] flex items-center justify-center">
        <button 
          onClick={onLoadMore} 
          disabled={isLoadingMore}
          className="text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-2"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Caricamento...</span>
            </>
          ) : (
            "Carica altri"
          )}
        </button>
      </div>
    </div>
  );
}
