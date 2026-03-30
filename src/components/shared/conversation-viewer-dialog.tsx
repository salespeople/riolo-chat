
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import MessageThread from '@/components/messages/message-thread';
import { agent } from '@/lib/data';
import type { SendPulseContact, Message, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ConversationViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: SendPulseContact | null;
}

export default function ConversationViewerDialog({ isOpen, onClose, contact }: ConversationViewerDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!contact) return;
      
      setIsLoading(true);
      setMessages([]);

      try {
        // UI-ONLY MODE: Return mock messages instead of calling API
        console.log("UI-Only Mode: Pretending to fetch conversation.");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const contactUser: User = {
            id: contact.channel_data.phone.toString(),
            name: contact.channel_data.name,
            avatar: ''
        };

        const mockMessages: Message[] = [
            { id: 'cv-mock-1', sender: contactUser, text: 'Ciao, questo è un messaggio di prova dalla vista conversazione.', timestamp: new Date(Date.now() - 120000).toISOString(), type: 'text' },
            { id: 'cv-mock-2', sender: agent, text: 'Ciao! Questa è una risposta di prova.', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'text' },
        ];

        setMessages(mockMessages);

      } catch (error) {
        console.error("Error fetching conversation (UI-Only): ", error);
        toast({
            variant: "destructive",
            title: "Errore",
            description: "Impossibile caricare la conversazione."
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && contact) {
      fetchMessages();
    }
  }, [isOpen, contact, toast]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="border-b p-6">
          <DialogTitle>Conversazione con {contact?.channel_data.name || 'Contatto'}</DialogTitle>
          <DialogDescription>
            Visualizza la cronologia dei messaggi per questo contatto.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-chat-bg">
            <ScrollArea className="h-full">
                <div className="p-4">
                    {isLoading ? (
                            <div className="space-y-6">
                            <div className="flex items-end gap-3 justify-start">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-16 w-48 rounded-lg" />
                            </div>
                            <div className="flex items-end gap-3 justify-end">
                                <Skeleton className="h-12 w-32 rounded-lg" />
                            </div>
                            </div>
                    ) : (
                        <MessageThread messages={messages} agent={agent} />
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
