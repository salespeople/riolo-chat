
"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { collection, Timestamp } from 'firebase/firestore';
import type { PrivacyConsent } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Check, X, Search, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';


interface PrivacyConsentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConsentRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
    </TableRow>
);

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const formatString = "dd/MM/yyyy HH:mm";
    if (timestamp instanceof Timestamp) {
        return format(timestamp.toDate(), formatString, { locale: it });
    }
    if (typeof timestamp === 'string') {
        try {
            return format(parseISO(timestamp), formatString, { locale: it });
        } catch (e) {
            return timestamp;
        }
    }
    return String(timestamp);
};


export default function PrivacyConsentsDialog({ isOpen, onClose }: PrivacyConsentsDialogProps) {
  const firestore = useFirestore();
  const consentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'privacy_consents') : null, [firestore]);
  const { data: consents, isLoading } = useCollection<PrivacyConsent>(consentsCollection);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConsents = useMemo(() => {
    if (!consents) return [];
    if (!searchQuery.trim()) return consents;
    return consents.filter(consent => 
        consent.phone.includes(searchQuery.trim())
    );
  }, [consents, searchQuery]);

  const consentStats = useMemo(() => {
    if (!consents || consents.length === 0) {
      return { yes: 0, no: 0, total: 0, yesPercent: 0, noPercent: 0 };
    }
    const total = consents.length;
    const yes = consents.filter(c => c.consent === true).length;
    const no = total - yes;
    const yesPercent = total > 0 ? (yes / total) * 100 : 0;
    const noPercent = total > 0 ? (no / total) * 100 : 0;
    return { yes, no, total, yesPercent, noPercent };
  }, [consents]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl flex flex-col h-[80vh]">
        <DialogHeader>
            <DialogTitle>Consensi Privacy</DialogTitle>
            <DialogDescription>
                Elenco dei consensi privacy registrati nel database.
            </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Cerca per numero di telefono..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm justify-start md:justify-end">
                <p className="font-medium text-muted-foreground whitespace-nowrap">Statistiche:</p>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3">
                         <Sigma className="mr-2 h-4 w-4" /> 
                         Totale: {isLoading ? <Skeleton className="h-4 w-6 ml-1 inline-block" /> : <span className="font-semibold ml-1">{consentStats.total}</span>}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-200/80 hover:bg-green-100/90">
                        Sì: {isLoading ? <Skeleton className="h-4 w-12 ml-1" /> : <span className="font-semibold ml-1">{consentStats.yes} ({consentStats.yesPercent.toFixed(1)}%)</span>}
                    </Badge>
                     <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200/80 hover:bg-red-100/90">
                        No: {isLoading ? <Skeleton className="h-4 w-12 ml-1" /> : <span className="font-semibold ml-1">{consentStats.no} ({consentStats.noPercent.toFixed(1)}%)</span>}
                    </Badge>
                </div>
            </div>
        </div>

        <div className="flex-1 min-h-0 border-t pt-4">
            <ScrollArea className="h-full">
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Contact ID</TableHead>
                        <TableHead>Data Consenso</TableHead>
                        <TableHead>Consenso</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, index) => <ConsentRowSkeleton key={index} />)
                        ) : filteredConsents && filteredConsents.length > 0 ? (
                            filteredConsents.map((consent) => (
                                <TableRow key={consent.id}>
                                    <TableCell className="font-medium">{consent.phone}</TableCell>
                                    <TableCell>{consent.contactId}</TableCell>
                                    <TableCell>{formatTimestamp(consent.timestamp)}</TableCell>
                                    <TableCell className="font-medium">
                                        {consent.consent === true ? (
                                            <Badge className={cn('bg-green-100 text-green-800 border-green-200/80 hover:bg-green-100/90')}>
                                                <Check className="mr-1 h-3 w-3" />
                                                Sì
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className={cn('bg-red-100 text-red-800 border-red-200/80 hover:bg-red-100/90')}>
                                                <X className="mr-1 h-3 w-3" />
                                                No
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Nessun consenso trovato.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
