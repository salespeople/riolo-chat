

"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Prescription } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { format, addDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    User, 
    FileDigit, 
    CalendarClock, 
    HelpCircle, 
    ShieldX, 
    Star, 
    Map,
    ListChecks,
    ThumbsUp,
    Link as LinkIcon,
    Copy,
    Check,
    AlertTriangle,
} from 'lucide-react';


interface PrescriptionDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription | null;
}

const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: React.ElementType }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }
  };

  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-3 border-b">
       <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
       <div className="flex-1">
         <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
         <dd className="text-sm text-foreground break-words">{value}</dd>
       </div>
       <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
          {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
       </Button>
    </div>
  );
};

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  }
  return 'Data non valida';
};

const getDocumentExpirationInfo = (prescription: Prescription | null): { isExpired: boolean, expiryDate: Date | null } => {
    if (!prescription || !prescription.createdAt) {
        return { isExpired: false, expiryDate: null };
    }
    
    try {
        let creationDate: Date;
        if (typeof prescription.createdAt === 'string') {
            // Handle ISO string format
            creationDate = parseISO(prescription.createdAt);
        } else if (prescription.createdAt && typeof (prescription.createdAt as any).toDate === 'function') {
            // Handle Firestore Timestamp object
            creationDate = (prescription.createdAt as Timestamp).toDate();
        } else {
            // Fallback for any other unexpected format
            throw new Error(`Invalid format for createdAt: ${typeof prescription.createdAt}`);
        }
        
        const expiryDate = addDays(creationDate, 7);
        const isExpired = new Date() > expiryDate;

        return { isExpired, expiryDate };

    } catch (error) {
        console.error("Error calculating document expiration:", error);
        return { isExpired: false, expiryDate: null }; // Fail safe, assume not expired
    }
};


export default function PrescriptionDetailDialog({ isOpen, onClose, prescription }: PrescriptionDetailDialogProps) {
  if (!prescription) return null;

  const exams = [
    prescription.prescribedExam0,
    prescription.prescribedExam1,
    prescription.prescribedExam2,
    prescription.prescribedExam3,
    prescription.prescribedExam4,
  ].filter(exam => exam && exam.trim() !== "");
  
  const { isExpired: isDocumentExpired } = useMemo(() => getDocumentExpirationInfo(prescription), [prescription]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl sm:w-3/5 h-[80vh] flex flex-col bg-card">
        <DialogHeader>
          <DialogTitle>Dettagli Ricetta: {prescription.prescriptionCode}</DialogTitle>
          <DialogDescription>
            Riepilogo completo della prescrizione medica.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
                <dl className="space-y-1">
                    <InfoRow label="Paziente" value={prescription.patientName} icon={User} />
                    <InfoRow label="Codice Fiscale" value={prescription.fiscalCode} icon={FileDigit} />
                    <InfoRow label="Data Creazione" value={formatTimestamp(prescription.createdAt)} icon={CalendarClock} />
                    <InfoRow label="Quesito Diagnostico" value={prescription.diagnosticQuestion} icon={HelpCircle} />
                    <InfoRow label="Codice Esenzione" value={prescription.exemptionCode} icon={ShieldX} />
                    <InfoRow label="Priorità" value={prescription.priority} icon={Star} />
                    <InfoRow label="Codice Regione" value={prescription.regionCode} icon={Map} />
                    
                    <div className="flex items-start gap-4 py-3 border-b">
                        <ListChecks className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                           <dt className="text-xs font-medium text-muted-foreground">Esami Prescritti</dt>
                            <dd className="text-sm text-foreground mt-1">
                                <ul className="list-disc list-inside space-y-1">
                                    {exams.map((exam, index) => (
                                        <li key={index}>{exam}</li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    </div>

                    <InfoRow label="Appropriatezza" value={prescription.appropriateness} icon={ThumbsUp} />
                    
                    {prescription.url && (
                        <div className="flex items-start gap-4 py-3">
                            <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                                <dt className="text-xs font-medium text-muted-foreground mb-2">Documento Originale</dt>
                                {isDocumentExpired ? (
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Link al documento scaduto.</span>
                                    </div>
                                ) : (
                                    <Button asChild variant="outline" size="sm">
                                        <a href={prescription.url} target="_blank" rel="noopener noreferrer">
                                            Visualizza Documento
                                        </a>
                                    </Button>
                                )}
                           </div>
                        </div>
                    )}
                </dl>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
