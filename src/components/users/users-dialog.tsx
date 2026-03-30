
"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { collection, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/firebase/auth/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, ShieldHalf, User as UserIconRole } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AddUserDialog from './add-user-dialog';
import EditUserDialog from './edit-user-dialog';
import DeleteUserDialog from './delete-user-dialog';
import { deleteUserAction } from '@/app/actions/users';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { useBotStore } from '@/stores/bot-store';

interface UsersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
  </TableRow>
)

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


export default function UsersDialog({ isOpen, onClose }: UsersDialogProps) {
  const firestore = useFirestore();
  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const { activeBotId } = useBotStore();

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      // Gli admin sono sempre visibili
      if (user.role === 'admin') {
        return true;
      }
      // Gli operatori sono visibili solo se hanno accesso al bot attivo
      if (user.role === 'operator' && Array.isArray(user.botIds)) {
        return (activeBotId ? user.botIds.includes(activeBotId) : user.botIds.length > 0);
      }
      return false;
    });
  }, [users, activeBotId]);


  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    const result = await deleteUserAction(selectedUser.uid);

    if (result.success) {
      toast({ title: "Successo!", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Errore", description: result.message });
    }

    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };


  const formatLastLogin = (lastLogin: any) => {
    if (!lastLogin) return 'N/A';
    if (lastLogin instanceof Timestamp) {
      const date = lastLogin.toDate();
      return format(date, "dd MMM yyyy, HH:mm", { locale: it });
    }
    try {
      const date = new Date(lastLogin);
      return format(date, "dd MMM yyyy, HH:mm", { locale: it });
    } catch {
      return 'Data non valida';
    }
  };

  return (
    <>
      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
      />
      {selectedUser && (
        <EditUserDialog
          isOpen={isEditUserDialogOpen}
          onClose={() => {
            setIsEditUserDialogOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
      {selectedUser && (
        <DeleteUserDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleConfirmDelete}
          userName={selectedUser.name || selectedUser.email || 'Utente'}
        />
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl flex flex-col h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gestione Utenti</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <TooltipProvider>
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>ID Operatore</TableHead>
                      <TableHead>Ultimo Login</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => <UserRowSkeleton key={index} />)
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: user.color || '#ccc' }} />
                              <span>{user.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell><RoleBadge role={user.role} /></TableCell>
                          <TableCell>{user.operatorId || 'N/A'}</TableCell>
                          <TableCell>{formatLastLogin(user.lastLogin)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Modifica utente</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(user)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Elimina utente</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Nessun utente trovato per questo ufficio.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </ScrollArea>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="default" onClick={() => setIsAddUserDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi utente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
