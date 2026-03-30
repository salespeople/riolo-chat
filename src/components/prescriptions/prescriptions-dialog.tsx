
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy } from 'firebase/firestore';
import type { Prescription } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PrescriptionDetailDialog from './prescription-detail-dialog';
import { Button } from '@/components/ui/button';

interface PrescriptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrescriptionRowSkeleton = () => (
  <TableRow>
    <TableCell className="py-2 px-3"><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell className="py-2 px-3"><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell className="py-2 px-3"><Skeleton className="h-4 w-40" /></TableCell>
    <TableCell className="py-2 px-3"><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell className="py-2 px-3"><Skeleton className="h-4 w-32" /></TableCell>
  </TableRow>
);


export default function PrescriptionsDialog({ isOpen, onClose }: PrescriptionsDialogProps) {
  const firestore = useFirestore();
  const prescriptionsCollection = useMemoFirebase(() =>
    firestore
      ? query(collection(firestore, 'prescriptions'), orderBy('createdAt', 'desc'))
      : null,
    [firestore]);

  const { data: prescriptions, isLoading } = useCollection<Prescription>(prescriptionsCollection);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const appInstanceId = process.env.NEXT_PUBLIC_APP_INSTANCE_ID;

  const filteredPrescriptions = useMemo(() => {
    if (!prescriptions) return [];

    let filtered = prescriptions.filter(p => p.instanceId === appInstanceId);

    if (!searchQuery.trim()) return filtered;

    const lowercasedQuery = searchQuery.trim().toLowerCase();

    return filtered.filter(p =>
      (p.patientName && p.patientName.toLowerCase().includes(lowercasedQuery)) ||
      (p.fiscalCode && p.fiscalCode.toLowerCase().includes(lowercasedQuery)) ||
      (p.phone && p.phone.toLowerCase().includes(lowercasedQuery)) ||
      (p.prescriptionCode && p.prescriptionCode.toLowerCase().includes(lowercasedQuery))
    );
  }, [prescriptions, searchQuery, appInstanceId]);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredPrescriptions.length / ITEMS_PER_PAGE);

  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPrescriptions.slice(startIndex, endIndex);
  }, [filteredPrescriptions, currentPage]);


  const handleOpenDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailOpen(false);
    setSelectedPrescription(null);
  };

  return (
    <>
      <PrescriptionDetailDialog
        isOpen={isDetailOpen}
        onClose={handleCloseDetails}
        prescription={selectedPrescription}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[80vh] flex flex-col bg-background p-0">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle>Elenco Ricette</DialogTitle>
              <DialogDescription>
                Visualizza tutte le ricette mediche registrate nel sistema per questa istanza.
              </DialogDescription>
            </DialogHeader>

            <div className="relative py-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per paziente, telefono, codice fiscale o codice ricetta..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 border-t px-6">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="py-2 px-3">Paziente</TableHead>
                    <TableHead className="py-2 px-3">Numero Telefono</TableHead>
                    <TableHead className="py-2 px-3">Codice Fiscale</TableHead>
                    <TableHead className="py-2 px-3">Codice Ricetta</TableHead>
                    <TableHead className="py-2 px-3">Quesito Diagnostico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 15 }).map((_, index) => <PrescriptionRowSkeleton key={index} />)
                  ) : paginatedPrescriptions && paginatedPrescriptions.length > 0 ? (
                    paginatedPrescriptions.map((p) => (
                      <TableRow key={p.id} onClick={() => handleOpenDetails(p)} className="cursor-pointer">
                        <TableCell className="font-medium py-2 px-3">{p.patientName}</TableCell>
                        <TableCell className="py-2 px-3">{p.phone || 'N/A'}</TableCell>
                        <TableCell className="py-2 px-3">{p.fiscalCode}</TableCell>
                        <TableCell className="py-2 px-3">{p.prescriptionCode}</TableCell>
                        <TableCell className="py-2 px-3">{p.diagnosticQuestion}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Nessuna ricetta trovata per i criteri specificati.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="sm:justify-between px-6 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Pagina {totalPages > 0 ? currentPage : 0} di {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Successivo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
