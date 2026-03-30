
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface WebhookLog {
    id: string;
    payload: string | any; // Allow any for backward compatibility
    createdAt: Timestamp;
}

interface WebhookLogsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogRowSkeleton = () => (
    <div className="border-b">
        <div className="p-4">
            <Skeleton className="h-5 w-3/4" />
        </div>
    </div>
);

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const formatString = "dd MMM yyyy, HH:mm:ss.SSS";
    if (timestamp instanceof Timestamp) {
        return format(timestamp.toDate(), formatString, { locale: it });
    }
    return String(timestamp);
};


export default function WebhookLogsDialog({ isOpen, onClose }: WebhookLogsDialogProps) {
  const firestore = useFirestore();
  const [refreshCount, setRefreshCount] = useState(0);
  
  const logsCollection = useMemoFirebase(() => 
      firestore 
      ? query(collection(firestore, 'webhook_logs'), orderBy('createdAt', 'desc'), limit(50)) 
      : null, 
  [firestore, refreshCount]);

  const { data: logs, isLoading } = useCollection<WebhookLog>(logsCollection);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
  };

  const getEventTitle = (log: WebhookLog) => {
    try {
        let payloadToParse = log.payload;
        // Handle old data that might be an object
        if (typeof payloadToParse !== 'string') {
            const parsed = payloadToParse;
            return parsed?.title || parsed?.type || 'Evento Sconosciuto';
        }
        // New data is a string, needs parsing
        const parsed = JSON.parse(payloadToParse);
        return parsed?.title || parsed?.type || 'Evento Sconosciuto';
    } catch {
        return 'Payload Non-JSON';
    }
  };

  const renderPayload = (log: WebhookLog) => {
    try {
        let payloadToParse = log.payload;
        // If the payload is already an object (from older faulty saves), stringify it.
        if (typeof payloadToParse !== 'string') {
            return JSON.stringify(payloadToParse, null, 2);
        }
        // Try to parse and pretty-print if it's a JSON string
        const parsed = JSON.parse(payloadToParse);
        return JSON.stringify(parsed, null, 2);
    } catch (e) {
        // If it's not valid JSON, return the raw string
        return log.payload;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl flex flex-col h-[85vh]">
        <DialogHeader>
            <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                    <DialogTitle>Log Webhook Ricevuti</DialogTitle>
                    <DialogDescription>
                        Visualizza gli ultimi 50 payload JSON grezzi ricevuti.
                    </DialogDescription>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    <span className="sr-only">Aggiorna log</span>
                </Button>
            </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 border-t pt-4">
            <ScrollArea className="h-full">
                 <Accordion type="single" collapsible className="w-full">
                    {isLoading && (!logs || logs.length === 0) ? (
                        Array.from({ length: 10 }).map((_, index) => <LogRowSkeleton key={index} />)
                    ) : logs && logs.length > 0 ? (
                        logs.map((log) => {
                            const eventTitle = getEventTitle(log);
                            return (
                                <AccordionItem value={log.id} key={log.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-4 w-full">
                                            <Badge variant="secondary">{eventTitle}</Badge>
                                            <span className="font-mono text-sm text-muted-foreground flex-1 text-left">{formatTimestamp(log.createdAt)}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <pre className="mt-2 w-full text-xs font-mono bg-muted p-4 rounded-md whitespace-pre-wrap break-all">
                                            {renderPayload(log)}
                                        </pre>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })
                    ) : (
                        <div className="flex items-center justify-center h-48">
                            <p className="text-muted-foreground">Nessun log trovato.</p>
                        </div>
                    )}
                 </Accordion>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
