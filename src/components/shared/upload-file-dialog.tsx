
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
import { uploadFile } from '@/lib/storage';
import { Progress } from '@/components/ui/progress';
import { Copy, Check } from 'lucide-react';
import { useFirebaseApp, useAuth } from '@/firebase';

interface UploadFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadFileDialog({
  isOpen,
  onClose,
}: UploadFileDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const firebaseApp = useFirebaseApp();
  const auth = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setDownloadUrl(null); // Reset URL when a new file is selected
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
        toast({ variant: 'destructive', title: 'Nessun file selezionato', description: 'Per favore, seleziona un file prima di caricarlo.' });
        return;
    }

    if (!auth.currentUser) {
       toast({ variant: 'destructive', title: 'Utente non autenticato', description: 'Devi essere autenticato per caricare un file.' });
       return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setDownloadUrl(null);

    try {
        const url = await uploadFile(
            firebaseApp,
            auth,
            selectedFile,
            'uploads',
            (progress) => setUploadProgress(progress)
        );
        setDownloadUrl(url);
        toast({ title: 'Upload completato!', description: 'Il file è stato caricato con successo.' });
    } catch (error) {
        console.error('Errore durante l\'upload:', error);
        toast({ variant: 'destructive', title: 'Errore di Upload', description: 'Non è stato possibile caricare il file. Controlla la console per i dettagli.' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!downloadUrl) return;
    navigator.clipboard.writeText(downloadUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setDownloadUrl(null);
    setIsCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica File</DialogTitle>
          <DialogDescription>
            Seleziona un file dal tuo computer per caricarlo su Firebase Storage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file-upload">File</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} disabled={isUploading} />
          </div>
          
          {isUploading && (
            <div className="space-y-2">
                <Label>Progresso Caricamento</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          )}

          {downloadUrl && (
            <div className="space-y-2">
                <Label>URL del File Caricato</Label>
                <div className="flex items-center gap-2">
                    <Input value={downloadUrl} readOnly className="bg-muted" />
                    <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}>
                        {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
          )}

        </div>
        <DialogFooter className="sm:justify-between">
           <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Chiudi
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Caricamento...' : 'Carica File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
