import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { PRICING, type ItemOptions } from "@/features/pricing/rules";

const character = z
  .string()
  .trim()
  .min(2)
  .max(12)
  .regex(/^\p{L}+$/u);
// RN-15: realm, facção e personagem — gold entrega no personagem; serviço convida o personagem
const who = {
  realm: z.string().trim().min(2).max(40),
  faction: z.enum(["alliance", "horde"]),
  character,
};
const gold = z.object({
  ...who,
  quantity: z.coerce
    .number()
    .int()
    .min(PRICING.gold.minK)
    .max(PRICING.gold.maxK)
    .refine((n) => n % PRICING.gold.stepK === 0),
});

export type ParsedItem = { options: ItemOptions; quantity: number; slotId?: string };
export type ParseResult = { ok: true; item: ParsedItem } | { ok: false; fields: string[] };
// o que o servidor sabe do produto (banco) — nunca vem do cliente (docs/09: entrada não confiável)
export type ProductRules = { addons: { name: string }[]; maxQuantity: number; hasSlots: boolean };

const fail = (e: z.ZodError): ParseResult => ({ ok: false, fields: e.issues.map((i) => String(i.path[0])) });

// RN-16 / RN-17 (#94): quantidade até o limite do produto; adicionais só os do produto; horário obrigatório
// quando o produto tem horários (sem horário, a run é agendada com o suporte depois do pagamento)
function service(rules: ProductRules) {
  const names = rules.addons.map((a) => a.name);
  return z.object({
    ...who,
    quantity: z.coerce.number().int().min(1).max(rules.maxQuantity).default(1),
    addon: z
      .array(z.string().refine((n) => names.includes(n)))
      .max(names.length)
      .default([]),
    slotId: rules.hasSlots ? z.uuid() : z.literal("").optional(),
  });
}

export function parseItem(
  kind: string,
  raw: Record<string, unknown>,
  rules: ProductRules = { addons: [], maxQuantity: 1, hasSlots: false },
): ParseResult {
  if (kind === "gold") {
    const r = gold.safeParse(raw);
    if (!r.success) return fail(r.error);
    const { quantity, ...o } = r.data;
    return { ok: true, item: { options: { kind, ...o }, quantity } };
  }
  const r = service(rules).safeParse(raw);
  if (!r.success) return fail(r.error);
  const { quantity, addon, slotId, realm, faction, character: name } = r.data;
  const options: ItemOptions = {
    kind: "service",
    realm,
    faction,
    character: name,
    addons: [...new Set(addon)],
  };
  return { ok: true, item: { options, quantity, ...(slotId ? { slotId } : {}) } };
}
