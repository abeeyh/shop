import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(60);
const text = (max: number) => z.string().trim().max(max);
const imageUrl = z
  .union([z.literal(""), z.url({ protocol: /^https$/ }).max(500)])
  .transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

// RN-13: categoria com tipo fixo; nome igual em todos os idiomas (RN-84)
export const categoryInput = z.object({
  name: text(60).min(2),
  slug,
  kind: z.enum(["gold", "raid", "dungeon"]),
  description: text(500),
  imageUrl,
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

// RN-19 / RN-12: preço digitado em USDT ("12.50") e gravado em centavos inteiros
export const productInput = z.object({
  categoryId: z.uuid(),
  name: text(80).min(2),
  slug,
  region: z.enum(["US", "EU"]),
  description: text(1000),
  imageUrl,
  price: z
    .string()
    .trim()
    .regex(/^\d{1,6}(\.\d{1,2})?$/)
    .transform((v) => Math.round(Number(v) * 100))
    .refine((c) => c > 0),
  active: checkbox,
});

export type CategoryInput = z.infer<typeof categoryInput>;
export type ProductInput = z.infer<typeof productInput>;

export const fieldsOf = (e: z.ZodError) => [...new Set(e.issues.map((i) => String(i.path[0])))];
