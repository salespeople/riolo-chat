
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { SendPulseContact, Bot } from "@/types";
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, MessageSquare, Trash2, Eye, User, Phone, Hash, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConversationViewerDialog from '@/components/shared/conversation-viewer-dialog';
import { deleteContactFromSendPulse, getContactByPhone, getContactById } from '@/lib/sendpulse';
import DeleteContactDialog from './delete-contact-dialog';

const InfoRow = ({ icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 w-40 text-muted-foreground shrink-0">
            {React.createElement(icon, { className: "h-4 w-4" })}
            <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex-1 text-sm text-foreground break-all">
            {value}
        </div>
    </div>
);


const ContactRow = ({ contact, onViewConversation, onOpenChat, onDelete }: { contact: SendPulseContact, onViewConversation: (contact: SendPulseContact) => void, onOpenChat: (contact: SendPulseContact) => void, onDelete: (contact: SendPulseContact) => void }) => {
    const formatContactPhone = (phone: number) => {
        let phoneStr = phone.toString();
        if (!phoneStr.startsWith('+')) {
            phoneStr = `+${phoneStr}`;
        }
        return phoneStr;
    };

    return (
        <div className="p-4 border-b transition-colors hover:bg-muted/50">
            <div className="grid gap-3">
                <InfoRow icon={User} label="Nome" value={contact.channel_data.name || 'N/A'} />
                <InfoRow icon={Phone} label="Numero Telefono" value={formatContactPhone(contact.channel_data.phone)} />
                <InfoRow icon={Hash} label="Contact ID" value={contact.id} />
                <InfoRow 
                    icon={Calendar} 
                    label="Ultima attività" 
                    value={contact.last_activity_at ? format(parseISO(contact.last_activity_at), 'dd/MM/yyyy HH:mm') : 'N/A'} 
                />
            </div>
            <div className="flex justify-end gap-1 mt-4">
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onViewConversation(contact)}>
                    <Eye className="mr-1 h-3 w-3" />
                    <span>Visualizza</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => onOpenChat(contact)} disabled>
                    <MessageSquare className="mr-1 h-3 w-3" />
                    <span>Apri Chat</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(contact)}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    <span>Elimina</span>
                </Button>
            </div>
        </div>
    );
};

interface ContactsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (contact: SendPulseContact) => void;
  bots: Bot[];
}


export default function ContactsDialog({ isOpen, onClose, onOpenChat, bots }: ContactsDialogProps) {
  const [contacts, setContacts] = useState<SendPulseContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'id'>('phone');
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [selectedContact, setSelectedContact] = useState<SendPulseContact | null>(null);
  const [isConversationViewerOpen, setIsConversationViewerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<SendPulseContact | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setPhoneError(null);
      setContacts([]);
      setIsLoading(false);
      if (bots.length > 0) {
        setSelectedBotId(bots[0].id);
      }
    }
  }, [isOpen, bots]);

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchType === 'phone' && value && !value.startsWith('+')) {
      setPhoneError('Il numero deve includere il prefisso internazionale (es. +39).');
    } else {
      setPhoneError(null);
    }
  };
  
  const handleSearch = async () => {
      if (!searchQuery.trim()) {
          toast({ variant: 'destructive', title: 'Input richiesto', description: 'Inserisci un numero di telefono o un ID contatto per la ricerca.'});
          return;
      }
      if (!selectedBotId) {
          toast({ variant: 'destructive', title: 'Bot non selezionato', description: 'Seleziona un bot per eseguire la ricerca.'});
          return;
      }
      if (searchType === 'phone' && phoneError) {
        return;
      }
      
      setIsLoading(true);
      setContacts([]);

      try {
          let response;
          if (searchType === 'id') {
              response = await getContactById(selectedBotId, searchQuery.trim());
          } else { // phone
              response = await getContactByPhone(selectedBotId, searchQuery.trim());
          }

          if (response.success && response.data) {
              setContacts([response.data]);
          } else {
              setContacts([]);
              toast({ title: `Ricerca per ${searchType}`, description: response.error || "Nessun contatto trovato." });
          }
      } catch (error) {
          console.error("Error searching contact:", error);
          toast({ variant: "destructive", title: "Errore di ricerca", description: "Impossibile eseguire la ricerca del contatto."});
      } finally {
          setIsLoading(false);
      }
  };

  const filteredContacts = useMemo(() => {
    return contacts;
  }, [contacts]);
  
  const handleViewConversation = (contact: SendPulseContact) => {
    setSelectedContact(contact);
    setIsConversationViewerOpen(true);
  };
  
  const handleOpenChat = (contact: SendPulseContact) => {
    toast({ title: "Funzione non disponibile", description: "L'apertura di una chat da qui è disabilitata."});
  };

  const handleCloseConversationViewer = () => {
    setIsConversationViewerOpen(false);
    setSelectedContact(null);
  };

  const handleDeleteRequest = (contact: SendPulseContact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;

    try {
      const spSuccess = await deleteContactFromSendPulse(contactToDelete.bot_id, contactToDelete.id);
      
      if (spSuccess) {
         setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
         toast({
            title: "Contatto Eliminato",
            description: `Il contatto ${contactToDelete.channel_data.name} è stato eliminato con successo.`,
        });
      } else {
         throw new Error("Failed to delete contact via API");
      }

    } catch (error) {
      console.error("Error deleting contact: ", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare il contatto.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  return (
    <>
    <ConversationViewerDialog
        isOpen={isConversationViewerOpen}
        onClose={handleCloseConversationViewer}
        contact={selectedContact}
    />
     <DeleteContactDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        contactName={contactToDelete?.channel_data.name || ''}
      />
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col p-0">
        <div className="p-6 pb-4">
            <DialogHeader>
            <DialogTitle>Cerca Contatto</DialogTitle>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Select value={selectedBotId} onValueChange={setSelectedBotId} disabled={isLoading}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Seleziona un bot" />
                    </SelectTrigger>
                    <SelectContent>
                        {bots.map(bot => <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex flex-col gap-2 flex-grow w-full">
                    <div className="flex gap-2">
                        <Input
                            placeholder={searchType === 'phone' ? 'Cerca per telefono...' : 'Cerca per Contact ID...'}
                            value={searchQuery}
                            onChange={handleSearchQueryChange}
                        />
                         <Select value={searchType} onValueChange={(v) => setSearchType(v as 'phone' | 'id')}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="phone">Telefono</SelectItem>
                                <SelectItem value="id">ID</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {phoneError && (
                      <div className="flex items-center gap-2 text-xs text-destructive px-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{phoneError}</span>
                      </div>
                    )}
                </div>
                 <Button size="default" onClick={handleSearch} disabled={isLoading || !selectedBotId}>
                    <Search className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    {isLoading ? 'Ricerca...' : 'Cerca'}
                </Button>
            </div>
            </DialogHeader>
        </div>
        <div className="flex-1 overflow-hidden border-t">
          <ScrollArea className="h-full max-h-[50vh]">
              {isLoading ? (
                    <div className="p-4">
                       <Skeleton className="h-24 w-full" />
                    </div>
              ) : filteredContacts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-10 text-center">
                    <User className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground">Nessun contatto trovato</p>
                    <p className="text-xs text-muted-foreground">Esegui una ricerca per visualizzare i risultati.</p>
                 </div>
              ) : (
                filteredContacts.map((contact) => (
                  <ContactRow 
                    key={contact.id} 
                    contact={contact} 
                    onViewConversation={handleViewConversation} 
                    onOpenChat={handleOpenChat}
                    onDelete={handleDeleteRequest}
                  />
                ))
              )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
