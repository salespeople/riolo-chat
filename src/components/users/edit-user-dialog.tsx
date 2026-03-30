
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import EditUserForm from './edit-user-form';
import type { UserProfile } from '@/firebase/auth/use-user';

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export default function EditUserDialog({ isOpen, onClose, user }: EditUserDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Utente</DialogTitle>
          <DialogDescription>
            Aggiorna i dettagli dell'utente. Le modifiche verranno applicate immediatamente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <EditUserForm user={user} onSuccess={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
