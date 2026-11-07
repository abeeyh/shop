import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { PRICING, type ItemOptions } from "@/features/pricing/rules";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

// RN-15: realm, facção e personagem; quantidade em milhares, em passos fixos
const gold = z.object({
  realm: z.string().trim().min(2).max(40),
  faction: z.enum(["alliance", "horde"]),
  character: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^\p{L}+$/u),
  quantity: z.coerce
    .number()
    .int()
    .min(PRICING.gold.minK)
    .max(PRICING.gold.maxK)
    .refine((n) => n % PRICING.gold.stepK === 0),
});
// RN-16: horário e opção de loot
const raid = z.object({ slotId: z.uuid(), loot: z.enum(["none", "armor", "full"]) });
// RN-17: nível da chave, runs e timed
const dungeon = z.object({
  keyLevel: z.coerce.number().int().min(2).max(15),
  runs: z.coerce.number().int().min(1).max(PRICING.dungeon.maxRuns),
  timed: checkbox,
});

export type ParsedItem = { options: ItemOptions; quantity: number; slotId?: string };
export type ParseResult = { ok: true; item: ParsedItem } | { ok: false; fields: string[] };

// O tipo vem do produto no banco, nunca do cliente (docs/09: entrada não confiável)
export function parseItem(kind: "gold" | "raid" | "dungeon", raw: Record<string, unknown>): ParseResult {
  const fail = (e: z.ZodError): ParseResult => ({
    ok: false,
    fields: e.issues.map((i) => String(i.path[0])),
  });
  if (kind === "gold") {
    const r = gold.safeParse(raw);
    if (!r.success) return fail(r.error);
    const { quantity, ...o } = r.data;
    return { ok: true, item: { options: { kind, ...o }, quantity } };
  }
  if (kind === "raid") {
    const r = raid.safeParse(raw);
    if (!r.success) return fail(r.error);
    return { ok: true, item: { options: { kind, loot: r.data.loot }, quantity: 1, slotId: r.data.slotId } };
  }
  const r = dungeon.safeParse(raw);
  if (!r.success) return fail(r.error);
  return {
    ok: true,
    item: { options: { kind, keyLevel: r.data.keyLevel, timed: r.data.timed }, quantity: r.data.runs },
  };
}
