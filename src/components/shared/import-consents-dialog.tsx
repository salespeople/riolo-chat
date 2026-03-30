
"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
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
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { PrivacyConsent } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportConsentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type MappedConsent = Omit<PrivacyConsent, 'id'> & { id: string };

// Funzione per il parsing del formato data "dd/MM/yyyy HH.mm.ss"
const parseCustomDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split(' ');
    if (parts.length !== 2) return null;

    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split('.');

    if (dateParts.length !== 3 || timeParts.length !== 3) return null;

    const [day, month, year] = dateParts.map(Number);
    const [hours, minutes, seconds] = timeParts.map(Number);

    // Mese in JavaScript è 0-indicizzato (0-11)
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    
    // Controlla se la data creata è valida e corrisponde ai numeri forniti
    if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return date;
};


export default function ImportConsentsDialog({ isOpen, onClose }: ImportConsentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<MappedConsent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setError(null);
      setIsParsing(true);

      Papa.parse<any>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const requiredColumns = ['id', 'timestamp', 'contactId', 'phone', 'consent'];
          const fileColumns = results.meta.fields || [];
          const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));

          if (missingColumns.length > 0) {
            setError(`File CSV non valido. Colonne mancanti: ${missingColumns.join(', ')}`);
            setParsedData([]);
          } else {
            const mappedData = results.data.map((row, index) => {
                const date = parseCustomDate(row.timestamp);
                if (!date) {
                    console.warn(`Riga ${index + 2}: Formato data non valido per "${row.timestamp}". Riga saltata.`);
                    return null;
                }

                return {
                    id: row.id,
                    timestamp: date,
                    contactId: row.contactId,
                    phone: row.phone,
                    consent: String(row.consent).toLowerCase() === 'true' || String(row.consent) === '1' || String(row.consent).toLowerCase() === 'si',
                };
            }).filter((item): item is MappedConsent => item !== null); // Rimuove le righe con data non valida

            if(mappedData.length === 0 && results.data.length > 0) {
                setError("Nessun record valido trovato. Controlla il formato della data in tutte le righe.");
            }
            setParsedData(mappedData);
          }
          setIsParsing(false);
        },
        error: (err) => {
          setError(`Errore durante la lettura del file: ${err.message}`);
          setIsParsing(false);
        }
      });
    }
  };

  const handleImport = async () => {
    if (!firestore || parsedData.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const consentsCollection = collection(firestore, 'privacy_consents');
      const batchSize = 400;
      let documentsProcessed = 0;

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = parsedData.slice(i, i + batchSize);
        
        chunk.forEach(consentData => {
          const docRef = doc(consentsCollection, consentData.id);
          // Firestore converte automaticamente l'oggetto Date in un Timestamp
          batch.set(docRef, consentData);
        });

        await batch.commit();
        documentsProcessed += chunk.length;
        setUploadProgress((documentsProcessed / parsedData.length) * 100);
      }

      toast({
        title: 'Importazione completata',
        description: `${parsedData.length} consensi sono stati importati con successo.`,
      });
      handleClose();

    } catch (err) {
      console.error("Error importing consents:", err);
      toast({
        variant: 'destructive',
        title: 'Errore durante l\'importazione',
        description: 'Si è verificato un errore durante il salvataggio dei dati. Controlla la console per i dettagli.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsParsing(false);
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importa Consensi Privacy</DialogTitle>
          <DialogDescription>
            Carica un file CSV per importare in massa i consensi privacy. Il file deve contenere le colonne: id, timestamp, contactId, phone, consent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="csv-file">File CSV</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isUploading || isParsing} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {isParsing ? (
             <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
        ) : parsedData.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
                <h3 className="text-sm font-medium">Anteprima Dati ({parsedData.length} record)</h3>
                <ScrollArea className="h-full border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Contact ID</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Consent</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedData.slice(0, 10).map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                                    <TableCell>{row.contactId}</TableCell>
                                    <TableCell>{row.phone}</TableCell>
                                    <TableCell>{row.consent ? 'Sì' : 'No'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 {isUploading && (
                    <div className="space-y-2">
                        <Progress value={uploadProgress} />
                        <p className="text-xs text-center text-muted-foreground">{Math.round(uploadProgress)}%</p>
                    </div>
                 )}
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Annulla
          </Button>
          <Button onClick={handleImport} disabled={isUploading || isParsing || parsedData.length === 0 || !!error}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isUploading ? `Importazione in corso...` : `Importa ${parsedData.length} record`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
