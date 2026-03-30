
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Pencil, FileText, Image, Loader2 } from 'lucide-react';
import type { QuickReply } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickReplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (reply: QuickReply) => void;
  quickReplies: QuickReply[];
  onManage: () => void;
  isLoading: boolean;
}

export default function QuickReplyDialog({
  isOpen,
  onClose,
  onSend,
  quickReplies,
  onManage,
  isLoading,
}: QuickReplyDialogProps) {
  const [selectedReplyId, setSelectedReplyId] = useState<string>("");
  const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReplyId("");
      setSelectedReply(null);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (selectedReplyId) {
        const selected = quickReplies.find(r => r.id === selectedReplyId);
        setSelectedReply(selected || null);
    } else {
        setSelectedReply(null);
    }
  }, [selectedReplyId, quickReplies]);


  const handleSend = () => {
    if (selectedReply) {
      onSend(selectedReply);
      setSelectedReplyId("");
      setSelectedReply(null);
      onClose();
    }
  };
  
  const validReplies = quickReplies.filter(reply => reply.title && reply.title.trim() !== "");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Risposte Rapide</DialogTitle>
          <DialogDescription>
            Seleziona o gestisci risposte rapide preimpostate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className='space-y-2'>
            <label className="text-sm font-medium">Seleziona una risposta rapida</label>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : (
                <Select onValueChange={setSelectedReplyId} value={selectedReplyId}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleziona una risposta..." />
                </SelectTrigger>
                <SelectContent>
                    {validReplies.map((reply) => (
                    <SelectItem key={reply.id} value={reply.id}>
                        {reply.title}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            )}
          </div>
          {selectedReply && (
            <div className="space-y-2">
                <label className="text-sm font-medium">Anteprima</label>
                <div className="p-3 text-sm bg-muted rounded-md border max-h-48 overflow-y-auto space-y-2">
                    {selectedReply.content && <p>{selectedReply.content}</p>}
                    {selectedReply.type !== 'text' && selectedReply.attachment && (
                        <div className="flex items-center gap-2 text-blue-600">
                             {selectedReply.type === 'image' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            <a href={selectedReply.attachment} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate">
                                {selectedReply.attachmentName || "Vedi allegato"}
                            </a>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
        <Separator />
        <DialogFooter className="flex-row justify-between w-full">
          <Button variant="outline" onClick={onManage}>
            <Pencil className="mr-2 h-4 w-4" />
            Gestisci Risposte
          </Button>
          <div className='flex gap-2'>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annulla
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSend} disabled={!selectedReplyId}>
              Invia
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
