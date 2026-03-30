"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AddUserForm from './add-user-form';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddUserDialog({ isOpen, onClose }: AddUserDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
          <DialogDescription>
            Crea un nuovo account utente compilando i campi sottostanti.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4">
            <AddUserForm onSuccess={onClose} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
