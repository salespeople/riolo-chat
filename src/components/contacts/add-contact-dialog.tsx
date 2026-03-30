
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addContact } from '@/lib/sendpulse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AddContactApiResponse, Bot } from '@/types';


const countryCodes = [
  { value: '+39', label: 'IT (+39)' },
  { value: '+41', label: 'CH (+41)' },
  { value: '+49', label: 'DE (+49)' },
  { value: '+33', label: 'FR (+33)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+1', label: 'US (+1)' },
];

interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded: () => void;
  bots: Bot[];
}

export default function AddContactDialog({
  isOpen,
  onClose,
  onContactAdded,
  bots,
}: AddContactDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+39');
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  

  const getApiErrorMessage = (response: AddContactApiResponse): string => {
    if (response.errors && response.errors.phone && response.errors.phone.length > 0) {
      return response.errors.phone[0];
    }
    return response.error || 'Errore imprevisto durante l\'aggiunta del contatto.';
  };


  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !selectedBotId) {
      toast({
        variant: 'destructive',
        title: 'Campi obbligatori',
        description: 'Bot, nome e numero di telefono sono richiesti.',
      });
      return;
    }

    const normalizedPhone = countryCode + phone.trim().replace(/\s/g, '');

    const phoneRegex = /^\+\d{9,15}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      toast({
        variant: 'destructive',
        title: 'Numero non valido',
        description: 'Il numero di telefono non sembra essere in un formato valido.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await addContact(selectedBotId, name.trim(), normalizedPhone);

      if (response.success) {
        toast({
          title: 'Contatto aggiunto',
          description: `Il contatto ${name.trim()} è stato salvato con successo.`,
        });
        onContactAdded();
        handleClose();
      } else {
        const errorMessage = getApiErrorMessage(response);
        toast({
            variant: 'destructive',
            title: 'Errore API',
            description: errorMessage,
        });
      }

    } catch (error) {
      console.error('Errore salvataggio contatto:', error);
      toast({
        variant: 'destructive',
        title: 'Errore nel salvataggio',
        description: 'Si è verificato un errore durante il salvataggio. Controlla la console per i dettagli.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setName('');
    setPhone('');
    setCountryCode('+39');
    setSelectedBotId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi nuovo contatto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bot" className="text-right">Bot</Label>
              <div className="col-span-3">
                  <Select value={selectedBotId} onValueChange={setSelectedBotId} disabled={isSaving}>
                      <SelectTrigger>
                          <SelectValue placeholder="Seleziona un bot" />
                      </SelectTrigger>
                      <SelectContent>
                          {bots.map(bot => (
                              <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Mario Rossi"
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Telefono
            </Label>
            <div className="col-span-3 flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode} disabled={isSaving}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Prefisso" />
                    </SelectTrigger>
                    <SelectContent>
                        {countryCodes.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                    placeholder="3331234567"
                    disabled={isSaving}
                />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva contatto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
