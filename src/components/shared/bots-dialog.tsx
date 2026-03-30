
"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Bot } from '@/types';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface BotsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const BotForm = ({ bot, onSave, onCancel, isSaving }: { bot: Partial<Bot> | null, onSave: (botData: Omit<Bot, 'id'>) => void, onCancel: () => void, isSaving: boolean }) => {
    const [name, setName] = useState(bot?.name || '');
    const [botId, setBotId] = useState(bot?.botId || '');
    const [clientId, setClientId] = useState(bot?.clientId || '');
    const [clientSecret, setClientSecret] = useState(bot?.clientSecret || '');
    const [instanceId, setInstanceId] = useState(bot?.instanceId || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !botId || !clientId || !clientSecret || !instanceId) {
            // Basic validation
            return;
        }
        onSave({ name, botId, clientId, clientSecret, instanceId });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4 border bg-muted/50 p-4 rounded-lg">
            <div className="space-y-2">
                <Label htmlFor="bot-name">Nome Bot (Numero)</Label>
                <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. 123456789" disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="bot-instanceId">instanceId (App Instance ID)</Label>
                <Input id="bot-instanceId" value={instanceId} onChange={(e) => setInstanceId(e.target.value)} placeholder="Es. palermo1" disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="bot-id">Bot ID</Label>
                <Input id="bot-id" value={botId} onChange={(e) => setBotId(e.target.value)} placeholder="ID del bot da SendPulse" disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input id="client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID API" disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input id="client-secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••••••••••" disabled={isSaving} />
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Annulla</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva'}
                </Button>
            </div>
        </form>
    );
};


export default function BotsDialog({ isOpen, onClose }: BotsDialogProps) {
    const firestore = useFirestore();
    const botsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bots') : null, [firestore]);
    const { data: bots, isLoading } = useCollection<Bot>(botsCollection);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBot, setEditingBot] = useState<Partial<Bot> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async (botData: Omit<Bot, 'id'>) => {
        if (!firestore || !botsCollection) return;
        setIsSaving(true);

        try {
            const docId = editingBot?.id || doc(botsCollection).id;
            await setDoc(doc(firestore, 'bots', docId), botData, { merge: true });

            toast({ title: `Bot ${editingBot?.id ? 'aggiornato' : 'aggiunto'}`, description: `Il bot "${botData.name}" è stato salvato.` });
            setIsFormOpen(false);
            setEditingBot(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile salvare il bot.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (botId: string) => {
        if (!firestore) return;
        await deleteDoc(doc(firestore, 'bots', botId));
        toast({ title: 'Bot eliminato', description: 'Il bot è stato rimosso con successo.' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl flex flex-col h-[70vh]">
                <DialogHeader>
                    <DialogTitle>Gestione Bot</DialogTitle>
                    <DialogDescription>
                        Aggiungi, modifica o elimina le credenziali dei tuoi bot SendPulse. Associa i bot a un ufficio per raggrupparli.
                    </DialogDescription>
                </DialogHeader>

                {isFormOpen ? (
                    <ScrollArea className="h-full flex-1 min-h-0 pr-6">
                        <BotForm bot={editingBot} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingBot(null); }} isSaving={isSaving} />
                    </ScrollArea>
                ) : (
                    <>
                        <div className="flex-1 min-h-0">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome (Numero)</TableHead>
                                            <TableHead>instanceId (App ID)</TableHead>
                                            <TableHead>Bot ID</TableHead>
                                            <TableHead className="text-right">Azioni</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                        ) : bots && bots.length > 0 ? (
                                            bots.map(bot => (
                                                <TableRow key={bot.id}>
                                                    <TableCell className="font-medium">{bot.name}</TableCell>
                                                    <TableCell>{bot.instanceId}</TableCell>
                                                    <TableCell className="font-mono text-xs">{bot.botId}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => { setEditingBot(bot); setIsFormOpen(true); }}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(bot.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">Nessun bot configurato.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => { setEditingBot({}); setIsFormOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" /> Aggiungi Bot
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
