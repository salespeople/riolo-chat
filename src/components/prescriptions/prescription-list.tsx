
"use client";

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Prescription } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PrescriptionDetailDialog from './prescription-detail-dialog';


interface PrescriptionListProps {
  contactId: string;
}

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), "dd MMM yyyy", { locale: it });
  }
  return 'Data non valida';
};

export default function PrescriptionList({ contactId }: PrescriptionListProps) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const prescriptionsQuery = useMemoFirebase(() => {
    if (firestore && user && contactId) {
      return query(
        collection(firestore, 'prescriptions'),
        where('contactID', '==', contactId)
      );
    }
    return null;
  }, [firestore, user, contactId]);

  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useCollection<Prescription>(prescriptionsQuery);
  const isLoading = isUserLoading || isLoadingPrescriptions;

  const sortedPrescriptions = useMemo(() => {
    if (!prescriptions) return [];
    return [...prescriptions].sort((a, b) => {
      const dateA = a.createdAt ? (a.createdAt as Timestamp).toMillis() : 0;
      const dateB = b.createdAt ? (b.createdAt as Timestamp).toMillis() : 0;
      return dateB - dateA; // Ordina dal più recente al più vecchio
    });
  }, [prescriptions]);

  const handleOpenDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailOpen(true);
  };
  
  const handleCloseDetails = () => {
    setIsDetailOpen(false);
    setSelectedPrescription(null);
  };


  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!prescriptions || prescriptions.length === 0) {
    return <p className="text-sm text-muted-foreground pt-2">Nessuna prescrizione trovata per questo contatto.</p>;
  }

  return (
    <>
        <PrescriptionDetailDialog 
            isOpen={isDetailOpen}
            onClose={handleCloseDetails}
            prescription={selectedPrescription}
        />
        <div className="pt-2 space-y-2">
            {sortedPrescriptions.map(p => (
            <Button 
                key={p.id}
                variant="ghost" 
                className="w-full h-auto justify-between items-center p-2"
                onClick={() => handleOpenDetails(p)}
            >
                <div className="flex items-center gap-2 text-left">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                 <span className="font-semibold text-sm truncate">{p.prescriptionCode}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap pl-2">{formatTimestamp(p.createdAt)}</span>
            </Button>
            ))}
        </div>
    </>
  );
}
