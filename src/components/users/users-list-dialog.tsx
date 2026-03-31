
"use client";

import React, { useMemo } from 'react';
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
import { collection } from 'firebase/firestore';
import type { UserProfile } from '@/firebase/auth/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldHalf, User as UserIconRole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { useBotStore } from '@/stores/bot-store';

interface UsersListDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
  </TableRow>
);

const RoleBadge = ({ role }: { role: UserRole }) => {
  const roleConfig = {
    superadmin: {
      label: 'Super Admin',
      className: 'bg-red-100 text-red-800 border-red-200/80 hover:bg-red-100/90',
      icon: ShieldHalf,
      description: 'Accesso completo a tutte le funzionalità.',
    },
    admin: {
      label: 'Admin',
      className: 'bg-amber-100 text-amber-800 border-amber-200/80 hover:bg-amber-100/90',
      icon: ShieldHalf,
      description: 'Privilegi amministrativi.',
    },
    operator: {
      label: 'Operator',
      className: 'bg-green-100 text-green-800 border-green-200/80 hover:bg-green-100/90',
      icon: UserIconRole,
      description: 'Accesso alle funzionalità operative di base e di supporto.',
    },
  };

  const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800', icon: UserIconRole, description: 'Ruolo non definito' };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={cn('font-semibold', config.className)} variant="outline">
            <config.icon className="mr-1.5 h-3.5 w-3.5" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function UsersListDialog({ isOpen, onClose }: UsersListDialogProps) {
  const firestore = useFirestore();
  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

  const { activeBotId } = useBotStore();

  const filteredOperators = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      // Exclude superadmin
      if (user.role === 'superadmin') return false;
      // Include admin and operator if they have access to the active bot
      if (!user.botId) return false;
      if (!activeBotId) return true;
      const userBotIds = Array.isArray(user.botId) ? user.botId : [user.botId];
      return userBotIds.includes(activeBotId);
    });
  }, [users, activeBotId]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl flex flex-col h-[70vh]">
        <DialogHeader>
          <DialogTitle>Lista Operatori</DialogTitle>
          <DialogDescription>
            Elenco di tutti gli operatori autorizzati ad accedere a questa istanza.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <TooltipProvider>
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-12">Colore</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => <UserRowSkeleton key={index} />)
                  ) : filteredOperators && filteredOperators.length > 0 ? (
                    filteredOperators.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell>
                          <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: user.color || '#ccc' }} />
                        </TableCell>
                        <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nessun operatore trovato per questa istanza.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
