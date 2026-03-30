
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus, X, File as FileIcon, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import type { QuickReply } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useAuth, useFirebaseApp } from '@/firebase';
import { uploadFile } from '@/lib/storage';
import { Progress } from '@/components/ui/progress';


interface ManageQuickRepliesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quickReplies: QuickReply[];
  onSave: (reply: Partial<QuickReply>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ManageQuickRepliesDialog({
  isOpen,
  onClose,
  quickReplies,
  onSave,
  onDelete,
}: ManageQuickRepliesDialogProps) {
    
  const [selectedReplyId, setSelectedReplyId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();

  const resetForm = (clearSelection = false) => {
    if (clearSelection) setSelectedReplyId("");
    setTitle("");
    setContent("");
    setStagedFile(null);
    setAttachmentUrl(undefined);
    setAttachmentName(undefined);
    setUploadProgress(0);
    setIsUploading(false);
  };
  
  useEffect(() => {
    if (isOpen) {
        if (selectedReplyId) {
            const selected = quickReplies.find(r => r.id === selectedReplyId);
            if (selected) {
                setTitle(selected.title);
                setContent(selected.content);
                setStagedFile(null); // Clear any staged file
                setAttachmentUrl(selected.attachment || undefined);
                setAttachmentName(selected.attachmentName || undefined);
            }
        } else {
            resetForm();
        }
    }
  }, [selectedReplyId, quickReplies, isOpen]);
  
 const handleSave = async () => {
    if (!title.trim()) {
        toast({ variant: "destructive", title: "Errore", description: "Il titolo non può essere vuoto." });
        return;
    }
    if (isUploading) {
        toast({ variant: "destructive", title: "Attendi", description: "Caricamento dell'allegato in corso." });
        return;
    }
      
    setIsSaving(true);

    try {
        let type: QuickReply['type'] = 'text';
        if (attachmentUrl) {
            type = attachmentName?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'document';
        }

        await onSave({
            id: selectedReplyId || undefined,
            title,
            content,
            attachment: attachmentUrl,
            attachmentName: attachmentName,
            type: type
        });

        toast({
            title: "Successo",
            description: `Risposta rapida ${selectedReplyId ? 'aggiornata' : 'creata'} con successo.`,
        });
        
        resetForm(true);
        onClose();

    } catch (error) {
         console.error("Save error:", error);
         toast({
            variant: "destructive",
            title: "Errore nel salvataggio",
            description: "Non è stato possibile salvare la risposta rapida.",
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedReplyId) return;
    setIsSaving(true);
    try {
      await onDelete(selectedReplyId);
      toast({ title: "Successo", description: "Risposta rapida eliminata." });
      resetForm(true);
    } catch (error) {
       toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare la risposta." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    resetForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagedFile(file);
      setAttachmentUrl(undefined); // New file overrides existing
      setAttachmentName(undefined);
    }
  };

  const handleUploadAttachment = async () => {
    if (!stagedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadFile(firebaseApp, auth, stagedFile, 'quick_replies', setUploadProgress);
      setAttachmentUrl(url);
      setAttachmentName(stagedFile.name);
      setStagedFile(null);
      toast({ title: 'Allegato caricato', description: 'Il file è pronto per essere salvato con la risposta.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore di Upload', description: 'Impossibile caricare il file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = () => {
    setStagedFile(null);
    setAttachmentUrl(undefined);
    setAttachmentName(undefined);
  }
  
  const hasAttachment = !!attachmentUrl;
  const hasStagedFile = !!stagedFile;
  const isSaveDisabled = isSaving || isUploading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
            <DialogTitle>Gestione Risposte Rapide</DialogTitle>
            <DialogDescription>
            Crea, modifica o seleziona risposte rapide preimpostate.
            </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
            
            <div className="flex items-center gap-2">
                <Select onValueChange={setSelectedReplyId} value={selectedReplyId} disabled={isSaveDisabled}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona per modificare..." />
                    </SelectTrigger>
                    <SelectContent>
                        {quickReplies.map((reply) => (
                        <SelectItem key={reply.id} value={reply.id}>
                            {reply.title}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleAddNew} disabled={isSaveDisabled}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                <Label>Titolo</Label>
                <Input 
                    placeholder="Titolo della risposta rapida" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSaveDisabled}
                />
            </div>

            <div className="space-y-2">
                <Label>Contenuto del messaggio</Label>
                <Textarea 
                    placeholder="Contenuto del messaggio..." 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    disabled={isSaveDisabled}
                />
            </div>

             <div className="space-y-3">
                <Label className="flex justify-between">
                    <span>Allegato</span>
                </Label>
                <input
                    id="attachment-file"
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, .pdf, .doc, .docx, .xls, .xlsx"
                    disabled={isSaveDisabled}
                />
                
                {hasAttachment && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                         {attachmentName?.match(/\.(jpg|jpeg|png|gif)$/i) ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:underline">{attachmentName || 'Vedi allegato'}</a>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveAttachment} disabled={isSaveDisabled}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                )}

                {!hasAttachment && !hasStagedFile && (
                     <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaveDisabled}>
                        <Paperclip className="w-4 h-4 mr-2" />
                        Scegli File
                    </Button>
                )}

                {hasStagedFile && (
                    <div className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            {stagedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                            <span className="truncate flex-1 font-medium">{stagedFile.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStagedFile(null)} disabled={isUploading}>
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                        {isUploading ? (
                             <div className="space-y-1">
                                <Progress value={uploadProgress} />
                                <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
                            </div>
                        ) : (
                             <Button size="sm" className="w-full" onClick={handleUploadAttachment}>
                                <Upload className="h-4 w-4 mr-2" />
                                Carica Allegato
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <div>
            {selectedReplyId && (
              <Button variant="destructive" onClick={handleDelete} disabled={isSaveDisabled}>
                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Elimina'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaveDisabled}>
              Annulla
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {isSaving ? 'Salvataggio...' : (selectedReplyId ? 'Salva Modifiche' : 'Crea Risposta')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    