
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

interface DeleteContactDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    contactName: string;
}

export default function DeleteContactDialog({
    isOpen,
    onClose,
    onConfirm,
    contactName,
}: DeleteContactDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sei sicuro di voler eliminare il contatto?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Questa azione eliminerà permanentemente il contatto <span className="font-semibold">{contactName}</span> da SendPulse. Non potrai annullare questa azione.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={onClose}>Annulla</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                         <Button variant="destructive" onClick={onConfirm}>Conferma Eliminazione</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

    