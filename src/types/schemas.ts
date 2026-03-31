
import { z } from 'zod';

export const userRoleSchema = z.enum(["superadmin", "admin", "operator"]);

const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

export const userInputSchema = z.object({
  name: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
  email: z.string().email({ message: "Inserisci un'email valida." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
  confirmPassword: z.string(),
  role: userRoleSchema,
  operatorId: z.string().optional(),
  botId: z.union([z.string(), z.array(z.string())]), // Bot ID(s) assigned to the user
  color: z.string().regex(hexColorRegex, { message: "Formato colore non valido." }).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});


export const userEditSchema = z.object({
  uid: z.string().min(1, { message: "L'ID utente è obbligatorio." }),
  name: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
  email: z.string().email({ message: "Inserisci un'email valida." }),
  role: userRoleSchema,
  operatorId: z.string().optional(),
  botId: z.union([z.string(), z.array(z.string())]).optional(),
  color: z.string().regex(hexColorRegex, { message: "Formato colore non valido." }).optional(),
});
