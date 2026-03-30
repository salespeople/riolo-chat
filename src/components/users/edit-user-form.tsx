
"use client";

import React, { useState } from 'react';
import { z } from "zod";
import { userEditSchema } from "@/types/schemas";
import type { UserEditInput, UserRole } from "@/types";
import { updateUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/firebase/auth/use-user';

interface EditUserFormProps {
  user: UserProfile;
  onSuccess?: () => void;
}

const roles: UserRole[] = ["admin", "operator"];

export default function EditUserForm({ user, onSuccess }: EditUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<UserEditInput>({
    uid: user.uid,
    name: user.name || "",
    email: user.email || "",
    role: user.role,
    operatorId: user.operatorId || "",
    instanceId: user.instanceId || [],
    color: user.color || "#0ea54f",
  });

  const [errors, setErrors] = useState<z.ZodError<UserEditInput> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInstanceIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const instanceIdArray = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, instanceId: instanceIdArray }));
  };

  const handleSelectChange = (name: keyof UserEditInput) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors(null);

    const validation = userEditSchema.safeParse(formData);

    if (!validation.success) {
      setErrors(validation.error);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await updateUserAction(validation.data);

      if (result.success) {
        toast({ title: "Successo!", description: result.message });
        onSuccess?.();
      } else {
        toast({ variant: "destructive", title: "Errore", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Errore Imprevisto", description: "Si è verificato un errore durante l'aggiornamento dell'utente." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getErrorForField = (fieldName: keyof UserEditInput) => {
    return errors?.errors.find(e => e.path.includes(fieldName))?.message;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" placeholder="Mario Rossi" value={formData.name} onChange={handleChange} disabled={isSubmitting} />
        {getErrorForField("name") && <p className="text-sm font-medium text-destructive">{getErrorForField("name")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="mario.rossi@example.com" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
        {getErrorForField("email") && <p className="text-sm font-medium text-destructive">{getErrorForField("email")}</p>}
      </div>

      <div className="space-y-2">
        <Label>Ruolo</Label>
        <Select onValueChange={handleSelectChange("role")} value={formData.role} disabled={isSubmitting}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un ruolo" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getErrorForField("role") && <p className="text-sm font-medium text-destructive">{getErrorForField("role")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="operatorId">Operator ID (SendPulse)</Label>
        <Input id="operatorId" name="operatorId" placeholder="ID operatore da SendPulse" value={formData.operatorId || ''} onChange={handleChange} disabled={isSubmitting} />
        {getErrorForField("operatorId") && <p className="text-sm font-medium text-destructive">{getErrorForField("operatorId")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instanceId">Uffici (separati da virgola)</Label>
        <Input id="instanceId" name="instanceId" placeholder="palermo1,carini1" value={Array.isArray(formData.instanceId) ? formData.instanceId.join(', ') : ''} onChange={handleInstanceIdChange} disabled={isSubmitting || formData.role === 'admin'} />
        {getErrorForField("instanceId") && <p className="text-sm font-medium text-destructive">{getErrorForField("instanceId")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Colore Operatore</Label>
        <div className="flex items-center gap-2">
          <Input id="color-picker" name="color" type="color" className="w-12 h-10 p-1" value={formData.color || '#0ea54f'} onChange={handleChange} disabled={isSubmitting} />
          <Input id="color-text" name="color" type="text" placeholder="#0ea54f" value={formData.color || '#0ea54f'} onChange={handleChange} disabled={isSubmitting} />
        </div>
        {getErrorForField("color") && <p className="text-sm font-medium text-destructive">{getErrorForField("color")}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
      </Button>
    </form>
  );
}
