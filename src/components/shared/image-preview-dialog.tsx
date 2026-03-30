
"use client";

import React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  imageUrl: string | null;
  file: File | null;
  caption: string;
  setCaption: (caption: string) => void;
}

export default function ImagePreviewDialog({
  isOpen,
  onClose,
  onSend,
  imageUrl,
  file,
  caption,
  setCaption,
}: ImagePreviewDialogProps) {
  
  const isImage = file?.type.startsWith('image/');
  const dialogTitle = isImage ? 'Anteprima Immagine' : 'Anteprima Documento';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {imageUrl && isImage ? (
            <div className="relative aspect-video w-full">
               <Image
                src={imageUrl}
                alt="Image preview"
                fill
                className="object-contain rounded-md"
              />
            </div>
          ) : (
            file && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-md">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
            )
          )}
          <Textarea
            placeholder="Aggiungi una didascalia..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Annulla
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSend}>
            Invia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
