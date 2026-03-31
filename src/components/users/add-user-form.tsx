
"use client";

import React, { useState } from 'react';
import { z } from "zod";
import { userInputSchema } from "@/types/schemas";
import type { UserInput, UserRole } from "@/types";
import { createUserAction } from "@/app/actions/users";
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
import { Checkbox } from '@/components/ui/checkbox';
import { useBotStore } from '@/stores/bot-store';

interface AddUserFormProps {
  onSuccess?: () => void;
}

const roles: UserRole[] = ["admin", "operator"];

export default function AddUserForm({ onSuccess }: AddUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { bots: allBots } = useBotStore();

  const [formData, setFormData] = useState<Omit<UserInput, 'botId'> & { botIds: string[] }>({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    role: "operator",
    operatorId: "",
    color: "#0ea54f",
    botIds: [],
  });

  const [errors, setErrors] = useState<z.ZodError<UserInput> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBotToggle = (botId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      botIds: checked
        ? [...prev.botIds, botId]
        : prev.botIds.filter(id => id !== botId),
    }));
  };

  const handleSelectChange = (name: keyof Omit<UserInput, 'botId'>) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors(null);

    const dataToValidate: UserInput = {
      ...formData,
      botId: formData.botIds,
    };

    const validation = userInputSchema.safeParse(dataToValidate);

    if (!validation.success) {
      setErrors(validation.error);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createUserAction(validation.data);

      if (result.success) {
        toast({ title: "Successo!", description: result.message });
        setFormData({
          email: "", name: "", password: "", confirmPassword: "", role: "operator", operatorId: "", color: "#0ea54f", botIds: [],
        });
        onSuccess?.();
      } else {
        toast({ variant: "destructive", title: "Errore", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Errore Imprevisto", description: "Si è verificato un errore durante la creazione dell'utente." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getErrorForField = (fieldName: keyof UserInput) => {
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
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} disabled={isSubmitting} />
        {getErrorForField("password") && <p className="text-sm font-medium text-destructive">{getErrorForField("password")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Conferma Password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} disabled={isSubmitting} />
        {getErrorForField("confirmPassword") && <p className="text-sm font-medium text-destructive">{getErrorForField("confirmPassword")}</p>}
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
        <Label>Bot Assegnati</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
          {allBots.length > 0 ? allBots.map(bot => (
            <div key={bot.id} className="flex items-center space-x-2">
              <Checkbox
                id={`add-bot-${bot.botId}`}
                checked={formData.botIds.includes(bot.botId)}
                onCheckedChange={(checked) => handleBotToggle(bot.botId, !!checked)}
                disabled={isSubmitting}
              />
              <label htmlFor={`add-bot-${bot.botId}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {bot.logoEmoji && <span className="mr-1">{bot.logoEmoji}</span>}
                {bot.name}{bot.phone ? ` (${bot.phone})` : ''}
              </label>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">Nessun bot disponibile. Configura prima i bot.</p>
          )}
        </div>
        {getErrorForField("botId") && <p className="text-sm font-medium text-destructive">{getErrorForField("botId")}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Colore Operatore</Label>
        <div className="flex items-center gap-2">
          <Input id="color-picker" type="color" className="w-12 h-10 p-1" name="color" value={formData.color || '#0ea54f'} onChange={handleChange} disabled={isSubmitting} />
          <Input id="color-text" type="text" placeholder="#0ea54f" name="color" value={formData.color || '#0ea54f'} onChange={handleChange} disabled={isSubmitting} />
        </div>
        {getErrorForField("color") && <p className="text-sm font-medium text-destructive">{getErrorForField("color")}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Creazione in corso...' : 'Crea Utente'}
      </Button>
    </form>
  );
}
