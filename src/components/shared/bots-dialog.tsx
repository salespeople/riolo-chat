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

type BotFormData = Omit<Bot, 'id'>;

const BotForm = ({ bot, onSave, onCancel, isSaving }: {
    bot: Partial<Bot> | null;
    onSave: (botData: BotFormData) => void;
    onCancel: () => void;
    isSaving: boolean;
}) => {
    const [name, setName] = useState(bot?.name || '');
    const [botId, setBotId] = useState(bot?.botId || '');
    const [phone, setPhone] = useState(bot?.phone || '');
    const [primaryColor, setPrimaryColor] = useState(bot?.primaryColor || bot?.headerColor || '#007bc3');
    const [secondaryColor, setSecondaryColor] = useState(bot?.secondaryColor || '#a4d4f5');
    const [headerTitle, setHeaderTitle] = useState(bot?.headerTitle || '');
    const [logoEmoji, setLogoEmoji] = useState(bot?.logoEmoji || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !botId) return;
        onSave({ name, botId, phone, primaryColor, secondaryColor, headerColor: primaryColor, headerTitle, logoEmoji });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4 border bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bot-name">Nome Bot *</Label>
                    <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Riolo Volvo" disabled={isSaving} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-id">Bot ID (SendPulse) *</Label>
                    <Input id="bot-id" value={botId} onChange={(e) => setBotId(e.target.value)} placeholder="ID del bot da SendPulse" disabled={isSaving} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-phone">Numero WhatsApp</Label>
                    <Input id="bot-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+390918488398" disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-headerTitle">Titolo Header</Label>
                    <Input id="bot-headerTitle" value={headerTitle} onChange={(e) => setHeaderTitle(e.target.value)} placeholder="Es. Riolo Volvo Chat" disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-primaryColor">Colore Primario (Header)</Label>
                    <div className="flex gap-2">
                        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border p-1 cursor-pointer" disabled={isSaving} />
                        <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#007bc3" disabled={isSaving} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-secondaryColor">Colore Secondario (Accenti)</Label>
                    <div className="flex gap-2">
                        <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded border p-1 cursor-pointer" disabled={isSaving} />
                        <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#a4d4f5" disabled={isSaving} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bot-logoEmoji">Logo Emoji</Label>
                    <Input id="bot-logoEmoji" value={logoEmoji} onChange={(e) => setLogoEmoji(e.target.value)} placeholder="🚗" disabled={isSaving} />
                </div>
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

    const handleSave = async (botData: BotFormData) => {
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

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        await deleteDoc(doc(firestore, 'bots', id));
        toast({ title: 'Bot eliminato', description: 'Il bot è stato rimosso.' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl flex flex-col h-[75vh]">
                <DialogHeader>
                    <DialogTitle>Gestione Bot</DialogTitle>
                    <DialogDescription>
                        Aggiungi, modifica o elimina i bot WhatsApp. Le credenziali API sono gestite tramite Secret Manager.
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
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Numero</TableHead>
                                            <TableHead>Bot ID</TableHead>
                                            <TableHead>Colori</TableHead>
                                            <TableHead className="text-right">Azioni</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                        ) : bots && bots.length > 0 ? (
                                            bots.map(bot => (
                                                <TableRow key={bot.id}>
                                                    <TableCell className="font-medium">
                                                        {bot.logoEmoji && <span className="mr-2">{bot.logoEmoji}</span>}
                                                        {bot.name}
                                                    </TableCell>
                                                    <TableCell>{bot.phone || '—'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{bot.botId}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {(bot.primaryColor || bot.headerColor) && (
                                                                <div className="flex items-center gap-1" title="Primario">
                                                                    <div className="w-5 h-5 rounded border" style={{ backgroundColor: bot.primaryColor || bot.headerColor }} />
                                                                </div>
                                                            )}
                                                            {bot.secondaryColor && (
                                                                <div className="flex items-center gap-1" title="Secondario">
                                                                    <div className="w-5 h-5 rounded border" style={{ backgroundColor: bot.secondaryColor }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
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
                                                <TableCell colSpan={5} className="text-center h-24">Nessun bot configurato.</TableCell>
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
