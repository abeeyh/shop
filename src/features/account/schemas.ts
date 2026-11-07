import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { routing } from "@/i18n/routing";

export const MAX_CHARACTERS = 10; // RN-108

// RN-15: mesmas regras do formulário de compra (o personagem salvo cai direto nele)
export const characterInput = z.object({
  realm: z.string().trim().min(2).max(40),
  faction: z.enum(["alliance", "horde"]),
  name: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^\p{L}+$/u),
});
export type CharacterInput = z.infer<typeof characterInput>;

// RN-107: e-mail + senha (12+, mesma regra da equipe — Better Auth minPasswordLength)
export const signUpInput = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  locale: z.enum(routing.locales),
});

export const signInInput = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
  locale: z.enum(routing.locales),
});
