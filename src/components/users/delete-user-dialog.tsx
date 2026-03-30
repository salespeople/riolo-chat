"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userName: string;
}

export default function DeleteUserDialog({
    isOpen,
    onClose,
    onConfirm,
    userName,
}: DeleteUserDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sei sicuro di voler eliminare questo utente?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Questa azione eliminerà in modo permanente l’utente <span className="font-semibold">{userName}</span>. Sei sicuro di voler procedere? L’operazione non può essere annullata.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="secondary" onClick={onClose}>Annulla</Button>
                    <AlertDialogAction asChild>
                         <Button variant="destructive" onClick={onConfirm}>Conferma</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
