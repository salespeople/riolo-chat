
"use client";

import type { Chat, VariablePayload, SendPulseBotVariable, SendPulseTag } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  User,
  Info,
  Tag as TagIcon,
  AtSign,
  Briefcase,
  Hash,
  Activity,
  ToggleLeft,
  Calendar,
  Variable,
  BadgeCent,
  Phone,
  Pencil,
  Save,
  X,
  Plus,
  Loader2,
  ChevronsUpDown,
  Check,
  Clock,
  Pause,
  Play,
  Notebook,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import Image from 'next/image';
import {
  parseISO,
  addHours,
  differenceInMilliseconds,
  format,
  formatDistanceToNowStrict,
} from "date-fns";
import { it } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { formatPhoneNumberDetailed } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setContactTag, removeContactTag, setContactVariables, deleteContactVariable, setPauseAutomation, deletePauseAutomation } from "@/lib/sendpulse";
import { produce } from "immer";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useSidebarDisplay } from "@/components/settings/sidebar-display-provider";
import PrescriptionList from '@/components/prescriptions/prescription-list';


interface ChatInfoProps {
  chat: Chat | null;
  botVariables: SendPulseBotVariable[];
  allTags: SendPulseTag[];
  isLoading?: boolean;
  onUpdateChat: (updater: (chat: Chat) => void) => void;
}

const InfoRow = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
}) => (
  <div className="flex items-start gap-3 text-sm">
    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium break-words text-sm">{value}</div>
    </div>
  </div>
);

const getStatusInfo = (status: number | undefined) => {
  switch (status) {
    case 1: return { text: "Attivo" };
    case 2: return { text: "Disiscritto" };
    case 3: return { "text": "Disabilitato" };
    case 4: return { text: "Bloccato" };
    default: return { text: "Sconosciuto" };
  }
};

const mergeVariables = (
    botVars: SendPulseBotVariable[],
    contactVars: Record<string, any> = {}
): Record<string, string | null> => {
    const allVars: Record<string, string | null> = {};
    
    // Add all possible bot variables, initially with null value
    botVars.forEach(botVar => {
        if (botVar.name !== 'GoogleAccessToken') { // Exclude specific variable
            allVars[botVar.name] = null;
        }
    });

    // Populate with values from the contact
    for (const key in contactVars) {
        if (Object.prototype.hasOwnProperty.call(allVars, key)) {
            allVars[key] = contactVars[key];
        }
    }
    
    return allVars;
};


export default function ChatInfo({
  chat,
  botVariables,
  allTags = [],
  isLoading,
  onUpdateChat,
}: ChatInfoProps) {
  const [supportWindow, setSupportWindow] = useState<{
    active: boolean;
    remaining: string;
  }>({ active: false, remaining: "" });
  
  const [automationPause, setAutomationPause] = useState<{
    isActive: boolean;
    expiresAt: string;
    remaining: string;
  }>({ isActive: false, expiresAt: "", remaining: "" });

  const [formattedLastActivity, setFormattedLastActivity] = useState<
    string
  >("");
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingVariables, setIsEditingVariables] = useState(false);
  const [editedVariables, setEditedVariables] = useState<Record<string, string | null>>({});
  const [isSavingVariables, setIsSavingVariables] = useState(false);
  
  const [tagInputValue, setTagInputValue] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isDeletingTag, setIsDeletingTag] = useState<string | null>(null);

  const [customPauseMinutes, setCustomPauseMinutes] = useState('');
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const quickPauseOptions = [30, 60, 90, 120];

  const { toast } = useToast();
  const { displaySettings, isDisplaySettingsLoading } = useSidebarDisplay();

  const userVariables = useMemo(() => {
    if (!chat || !botVariables) return {};
    return mergeVariables(botVariables, chat.details?.variables);
  }, [chat, botVariables]);


  useEffect(() => {
    setIsMounted(true);

    if (!chat) {
      // Reset edit states when chat is deselected
      setIsEditingVariables(false);
      return;
    }

    // Reset states when chat changes
    setIsEditingVariables(false);
    setAutomationPause({ isActive: false, expiresAt: "", remaining: "" });

    const sourceTimestamp = chat?.lastActivityAt || chat?.lastMessageTimestamp;

    if (sourceTimestamp) {
      const lastActivityDate = parseISO(sourceTimestamp);
      setFormattedLastActivity(format(lastActivityDate, "dd/MM/yyyy HH:mm"));
    } else {
        setFormattedLastActivity("");
    }

    const intervals: number[] = [];

    const setupTimers = () => {
        let supportIntervalId: number;
        let pauseIntervalId: number;

        // --- Support Window Timer ---
        if (sourceTimestamp) {
            const expirationDate = addHours(parseISO(sourceTimestamp), 24);
            const calculateRemaining = () => {
                const now = new Date();
                const diff = differenceInMilliseconds(expirationDate, now);
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    const newRemaining = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
                    setSupportWindow({ active: true, remaining: newRemaining });
                } else {
                    setSupportWindow({ active: false, remaining: "" });
                    const intervalId = intervals.find(id => id === supportIntervalId);
                    if(intervalId) clearInterval(intervalId);
                }
            };
            calculateRemaining();
            supportIntervalId = window.setInterval(calculateRemaining, 1000);
            intervals.push(supportIntervalId);
        } else {
            setSupportWindow({ active: false, remaining: "" });
        }
        
        // --- Automation Pause Timer ---
        if (chat?.details?.automation_paused_until) {
            const pauseExpiration = parseISO(chat.details.automation_paused_until);
            const calculatePauseRemaining = () => {
                const now = new Date();
                const diff = differenceInMilliseconds(pauseExpiration, now);
                if (diff > 0) {
                    setAutomationPause({
                        isActive: true,
                        expiresAt: format(pauseExpiration, "dd/MM/yyyy HH:mm"),
                        remaining: formatDistanceToNowStrict(pauseExpiration, { addSuffix: true, locale: it }),
                    });
                } else {
                    setAutomationPause({ isActive: false, expiresAt: "", remaining: "" });
                     onUpdateChat(draft => {
                        if (draft.details) draft.details.automation_paused_until = null;
                    });
                    const intervalId = intervals.find(id => id === pauseIntervalId);
                    if(intervalId) clearInterval(intervalId);
                }
            };
            calculatePauseRemaining();
            pauseIntervalId = window.setInterval(calculatePauseRemaining, 1000 * 30); // Check every 30s
            intervals.push(pauseIntervalId);
        } else {
            setAutomationPause({ isActive: false, expiresAt: "", remaining: "" });
        }
    }
    
    setupTimers();

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [chat, onUpdateChat]);
  
  const handleEditVariables = () => {
    setEditedVariables(userVariables);
    setIsEditingVariables(true);
  };

  const handleCancelEditVariables = () => {
    setIsEditingVariables(false);
    setEditedVariables({});
  };

  const handleSaveVariables = async () => {
    if (!chat) return;
  
    const originalVariables = userVariables;
    const variablesToUpdate: VariablePayload[] = [];
    const variablesToDelete: string[] = [];
  
    // Check for changes, updates, and deletions
    for (const key in editedVariables) {
      if (Object.prototype.hasOwnProperty.call(editedVariables, key)) {
          const originalValue = originalVariables[key];
          const newValue = editedVariables[key];
      
          if (originalValue !== newValue) {
            if (newValue && newValue.trim() !== '') {
              variablesToUpdate.push({ variable_name: key, variable_value: newValue });
            } else if (originalValue !== null && (newValue === null || newValue.trim() === '')) {
              variablesToDelete.push(key);
            }
          }
      }
    }
  
    if (variablesToUpdate.length === 0 && variablesToDelete.length === 0) {
      setIsEditingVariables(false);
      return;
    }
  
    setIsSavingVariables(true);
  
    try {
      const apiPromises: Promise<any>[] = [];
  
      if (variablesToUpdate.length > 0) {
        apiPromises.push(setContactVariables(chat.botId, chat.contactId, variablesToUpdate));
      }
      if (variablesToDelete.length > 0) {
        variablesToDelete.forEach(variableName => {
          apiPromises.push(deleteContactVariable(chat.botId, chat.contactId, variableName));
        });
      }
  
      const results = await Promise.all(apiPromises);
  
      const allSucceeded = results.every(res => res.success);
  
      if (allSucceeded) {
        toast({ title: 'Variabili salvate', description: 'Le modifiche sono state salvate con successo.' });
  
        onUpdateChat(draft => {
          if (!draft.details) draft.details = {};
          if (!draft.details.variables) draft.details.variables = {};
  
          variablesToUpdate.forEach(v => {
            draft.details!.variables![v.variable_name] = v.variable_value;
          });
          variablesToDelete.forEach(name => {
            delete draft.details!.variables![name];
          });
        });
        setIsEditingVariables(false);
      } else {
        throw new Error("Una o più operazioni sulle variabili non sono riuscite.");
      }
    } catch (error) {
      console.error("Error saving variables:", error);
      toast({ variant: 'destructive', title: 'Errore nel salvataggio', description: (error as Error).message });
    } finally {
      setIsSavingVariables(false);
    }
  };
  
  
  const handleVariableChange = (key: string, value: string) => {
    setEditedVariables(prev => ({ ...prev, [key]: value }));
  };
  
    const handleAddTag = async (tagName: string) => {
        if (!tagName || !chat) return;

        setIsAddingTag(true);
        const response = await setContactTag(chat.botId, chat.contactId, tagName);

        if (response.success) {
            toast({ title: 'Tag aggiunto', description: `Il tag "${tagName}" è stato aggiunto.` });
            onUpdateChat(draft => {
                if (!draft.details) draft.details = {};
                if (!draft.details.tags) draft.details.tags = [];
                if (!draft.details.tags.find(t => t === tagName)) {
                    draft.details.tags.push(tagName);
                }
            });
            setTagInputValue('');
        } else {
            toast({ variant: 'destructive', title: 'Errore', description: response.error || 'Impossibile aggiungere il tag.' });
        }
        setIsAddingTag(false);
        setIsTagPopoverOpen(false);
    };

  const handleRemoveTag = async (tagName: string) => {
      if (!chat) return;
      
      setIsDeletingTag(tagName);

      const response = await removeContactTag(chat.botId, chat.contactId, tagName);

      if (response.success) {
          toast({ title: 'Tag rimosso', description: `Il tag "${tagName}" è stato rimosso.` });
          onUpdateChat(draft => {
              if (draft.details && draft.details.tags) {
                  draft.details.tags = draft.details.tags.filter(t => t !== tagName);
              }
          });
      } else {
          toast({ variant: 'destructive', title: 'Errore', description: response.error || 'Impossibile rimuovere il tag.' });
      }

      setIsDeletingTag(null);
  };
  
  const handleSetPause = async (minutes: number) => {
    if (!chat || minutes <= 0) return;

    setIsPausing(true);
    try {
        const response = await setPauseAutomation(chat.botId, chat.contactId, minutes);
        if (response.success && response.data) {
            const expiryDate = parseISO(response.data);
            toast({ 
                title: 'Automazione in pausa', 
                description: `Il bot è in pausa fino alle ${format(expiryDate, "HH:mm 'del' dd/MM/yyyy")}.`
            });
            onUpdateChat(draft => {
                if (!draft.details) draft.details = {};
                draft.details.automation_paused_until = response.data;
            });
            setCustomPauseMinutes('');
        } else {
            throw new Error(response.error || 'Impossibile impostare la pausa.');
        }
    } catch (error) {
        console.error("Error setting pause:", error);
        toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
    } finally {
        setIsPausing(false);
    }
  };

  const handleResumeAutomation = async () => {
    if (!chat) return;

    setIsResuming(true);
    try {
        const response = await deletePauseAutomation(chat.botId, chat.contactId);
        if (response.success) {
            toast({ title: 'AutoFlow ripreso', description: 'Le automazioni per questo contatto sono di nuovo attive.' });
            onUpdateChat(draft => {
                if (draft.details) {
                    draft.details.automation_paused_until = null;
                }
            });
        } else {
            throw new Error(response.error || 'Impossibile riprendere l’AutoFlow.');
        }
    } catch (error) {
        console.error("Error resuming automation:", error);
        toast({ variant: 'destructive', title: 'Errore', description: (error as Error).message });
    } finally {
        setIsResuming(false);
    }
  };

  const availableTags = useMemo(() => {
    const contactTags = chat?.details?.tags || [];
    return allTags
      .filter(tag => !contactTags.includes(tag.name))
      .sort((a, b) => b.count - a.count);
  }, [allTags, chat?.details?.tags]);

  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
       <Separator />
       <div className="space-y-4">
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
       </div>
    </div>
  );
  
  const renderNoChatSelected = () => (
      <div className="flex h-full flex-col items-center justify-center p-4">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <User className="h-6 w-6 mx-auto text-muted-foreground/80" />
            <p className="font-medium">Nessuna chat selezionata</p>
            <p className="text-xs">
              Scegli una chat per vedere i dettagli del contatto.
            </p>
          </div>
      </div>
  );

  const statusInfo = getStatusInfo(chat?.details?.status);
  const sortedUserVariables = Object.entries(userVariables).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const renderChatDetails = () => (
     <div className="space-y-6">
        <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <Avatar className="h-12 w-12 mb-2">
            <AvatarFallback>
                <User className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
            </Avatar>
            <div className="space-y-1 py-1 text-center">
            <p className="font-semibold text-base">{chat!.user.name}</p>
            <div className="h-6 p-1 flex items-center justify-center">
                {isMounted && supportWindow.active ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100/90 border-green-200">Support Window attiva: {supportWindow.remaining}</Badge>
                ) : isMounted && !supportWindow.active ? (
                <Badge variant="destructive">Scaduta</Badge>
                ) : (
                    <Skeleton className="h-6 w-24 rounded-full" />
                )}
            </div>
            </div>
        </div>
        
        <Separator />

        <Accordion type="multiple" className="w-full" defaultValue={['item-1']}>
            
            {displaySettings.contactDetails.showSection && (
                <AccordionItem value="details">
                    <AccordionTrigger className="py-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Dettagli</h4>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 pt-2">
                        {displaySettings.contactDetails.fields.phone && <InfoRow label="Telefono" value={formatPhoneNumberDetailed(chat!.user.id)} icon={Phone} />}
                        {displaySettings.contactDetails.fields.contactId && <InfoRow label="Contact ID" value={chat!.contactId} icon={Hash} />}
                        {displaySettings.contactDetails.fields.status && (
                            <div className="flex items-start gap-3 text-sm">
                                <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Stato</p>
                                <div className="font-medium break-words text-sm">{statusInfo.text}</div>
                                </div>
                            </div>
                        )}
                        {displaySettings.contactDetails.fields.isChatOpened && <InfoRow label="Chat aperta" value={chat!.details?.is_chat_opened ? "Sì" : "No"} icon={ToggleLeft} />}
                        {displaySettings.contactDetails.fields.lastActivity && <InfoRow label="Ultima attività" value={formattedLastActivity || 'N/D'} icon={Calendar} />}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            )}
            
            <AccordionItem value="prescriptions">
            <AccordionTrigger className="py-2">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Notebook className="h-4 w-4 text-muted-foreground" /> Prescrizioni</h4>
            </AccordionTrigger>
            <AccordionContent>
                <PrescriptionList contactId={chat!.contactId} />
            </AccordionContent>
            </AccordionItem>

            {displaySettings.pauseAutomation && (
            <AccordionItem value="pause">
                <AccordionTrigger className="py-2">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Pause className="h-4 w-4 text-muted-foreground" /> Pausa Automazione</h4>
                </AccordionTrigger>
                <AccordionContent>
                <div className="space-y-4 pt-2">
                    {automationPause.isActive ? (
                        <div className="text-sm space-y-3">
                            <div className="text-center bg-amber-50 text-amber-800 p-3 rounded-md border border-amber-200">
                                <p>L'automazione è in pausa.</p>
                                <p className="font-semibold">Termina {automationPause.remaining}</p>
                                <p className="text-xs">(alle {automationPause.expiresAt})</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={handleResumeAutomation} disabled={isResuming}>
                            {isResuming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            Riprendi AutoFlow
                            </Button>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground text-center py-2">L'automazione è attiva.</p>
                            <div className="grid grid-cols-4 gap-2">
                                {quickPauseOptions.map(min => (
                                    <Button key={min} variant="outline" size="sm" onClick={() => handleSetPause(min)} disabled={isPausing}>
                                        {isPausing ? <Loader2 className="h-4 w-4 animate-spin" /> : `${min}m`}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                type="number"
                                placeholder="Minuti"
                                className="h-9"
                                value={customPauseMinutes}
                                onChange={(e) => setCustomPauseMinutes(e.target.value)}
                                disabled={isPausing}
                                />
                                <Button onClick={() => handleSetPause(Number(customPauseMinutes))} disabled={isPausing || !customPauseMinutes}>
                                    {isPausing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Imposta'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
                </AccordionContent>
            </AccordionItem>
            )}

            {displaySettings.variables.showSection && (
                <AccordionItem value="variables">
                <AccordionTrigger className="py-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Variable className="h-4 w-4 text-muted-foreground" /> Variabili</h4>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                    <div className="flex justify-end">
                        {isEditingVariables ? (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={handleSaveVariables} disabled={isSavingVariables}>
                                    {isSavingVariables ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={handleCancelEditVariables} disabled={isSavingVariables}><X className="h-4 w-4" /></Button>
                            </div>
                        ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleEditVariables}>
                            <Pencil className="h-3 w-3 mr-1" /> Modifica
                            </Button>
                        )}
                    </div>
                    {sortedUserVariables.length > 0 ? (
                        sortedUserVariables
                            .filter(([key]) => displaySettings.variables.fields[key] !== false) // Filtra in base alle impostazioni
                            .map(([key, value]) => (
                            <div key={key} className="text-xs space-y-1">
                                <p className="font-medium text-muted-foreground">{key}</p>
                                {isEditingVariables ? (
                                    <Input
                                    value={editedVariables[key] || ''}
                                    onChange={(e) => handleVariableChange(key, e.target.value)}
                                    className="h-8 text-xs"
                                    disabled={isSavingVariables}
                                    placeholder="Non valorizzata"
                                    />
                                ) : (
                                    value ? (
                                        <p className="font-mono bg-muted/50 p-1.5 rounded-md break-all">{String(value)}</p>
                                    ) : (
                                        <p className="text-muted-foreground italic text-xs">Non valorizzata</p>
                                    )
                                )}
                            </div>
                            ))
                    ) : (
                        <p className="text-sm text-muted-foreground">Nessuna variabile</p>
                    )}
                    </div>
                </AccordionContent>
                </AccordionItem>
            )}


            {displaySettings.tags && (
            <AccordionItem value="tags">
                <AccordionTrigger className="py-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><TagIcon className="h-4 w-4 text-muted-foreground" /> Tags</h4>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-wrap gap-2">
                            {(chat!.details?.tags && chat!.details.tags.length > 0) ? (
                                chat!.details.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="group relative pr-6">
                                        {tag}
                                        <button 
                                            onClick={() => handleRemoveTag(tag)}
                                            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                                            disabled={!!isDeletingTag}
                                            aria-label={`Remove tag ${tag}`}
                                        >
                                            {isDeletingTag === tag ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                        </button>
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Nessun tag assegnato</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isTagPopoverOpen}
                                        className="w-full justify-between"
                                        disabled={isAddingTag || !!isDeletingTag}
                                    >
                                        <span className="truncate">{tagInputValue || "Aggiungi un tag..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput 
                                            placeholder="Cerca o crea un tag..."
                                            value={tagInputValue}
                                            onValueChange={setTagInputValue}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full justify-start"
                                                    onClick={() => handleAddTag(tagInputValue)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Crea nuovo tag: "{tagInputValue}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {availableTags.map((tag) => (
                                                    <CommandItem
                                                        key={tag.id}
                                                        value={tag.name}
                                                        onSelect={(currentValue) => {
                                                            handleAddTag(currentValue);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                tagInputValue === tag.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {tag.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            )}

            {displaySettings.operator && (
            <AccordionItem value="operator">
                <AccordionTrigger className="py-2">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Operatore Assegnato</h4>
                </AccordionTrigger>
                <AccordionContent>
                <div className="pt-2">
                    {chat!.details?.operator ? (
                    <div className="space-y-3">
                        <InfoRow label="Username" value={chat!.details.operator.username} icon={User} />
                        <InfoRow label="Email" value={chat!.details.operator.email} icon={AtSign} />
                    </div>
                    ) : (
                    <p className="text-sm text-muted-foreground italic">Nessun operatore assegnato</p>
                    )}
                </div>
                </AccordionContent>
            </AccordionItem>
            )}
        </Accordion>
    </div>
  );


  return (
    <Card className="h-full rounded-none border-0 border-l bg-card shadow-none flex flex-col">
       <CardHeader className="p-4 border-b">
         <CardTitle className="text-lg">Informazioni Contatto</CardTitle>
       </CardHeader>
       <CardContent className="flex-1 p-4 overflow-y-auto">
        {isLoading || isDisplaySettingsLoading ? renderLoadingState() : !chat ? renderNoChatSelected() : renderChatDetails()}
      </CardContent>
    </Card>
  );
}

    