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

// ---- Promoções e cupons (RN-21, RN-25) ----

const utc = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((v) => new Date(`${v}:00Z`)) // datetime-local digitado em UTC (RN-83: guardado em UTC)
  .refine((d) => !Number.isNaN(d.getTime())); // 2026-13-45 → erro no campo, não 500

const usdtCents = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/)
  .transform((v) => Math.round(Number(v) * 100));

const optionalInt = z.union([
  z.literal("").transform(() => null),
  z.coerce.number().int().min(1).max(1_000_000),
]);

// "store" | "category:<uuid>" | "product:<uuid>" → escopo e alvo
const target = z
  .string()
  .regex(/^(store|category:[0-9a-f-]{36}|product:[0-9a-f-]{36})$/)
  .transform((v) => {
    const [scope, id] = v.split(":") as ["store" | "category" | "product", string | undefined];
    return {
      scope,
      categoryId: scope === "category" ? id! : null,
      productId: scope === "product" ? id! : null,
    };
  });

const discountBase = z.object({
  type: z.enum(["percent", "fixed"]),
  value: z.string().trim(),
  target,
  startsAt: utc,
  endsAt: utc,
  active: checkbox,
});

// RN-21: percentual 1–90 (inteiro) ou valor fixo em USDT; fim depois do início
function discountValue<T extends z.infer<typeof discountBase>>(v: T, ctx: z.RefinementCtx) {
  const n = v.type === "percent" ? Number(v.value) : usdtCents.safeParse(v.value).data;
  const ok = v.type === "percent" ? Number.isInteger(n) && n! >= 1 && n! <= 90 : !!n && n > 0;
  if (!ok) ctx.addIssue({ code: "custom", path: ["value"], message: "value" });
  if (v.endsAt <= v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "endsAt" });
}

const toRow = <T extends z.infer<typeof discountBase>>({ target: t, value, ...v }: T) => ({
  ...v,
  ...t,
  value: v.type === "percent" ? Number(value) : usdtCents.parse(value),
});

export const promotionInput = discountBase
  .extend({ name: text(80).min(2) })
  .superRefine(discountValue)
  .transform(toRow);

export const couponInput = discountBase
  .extend({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[\w-]{6,40}$/), // RN-28: curto demais é fácil de adivinhar
    maxUses: optionalInt,
    maxUsesPerEmail: optionalInt,
    minOrder: z.union([z.literal("").transform(() => 0), usdtCents]),
  })
  .superRefine(discountValue)
  .transform(({ minOrder, ...v }) => ({ ...toRow(v), minOrderUsdtCents: minOrder }));

export type PromotionInput = z.infer<typeof promotionInput>;
export type CouponInput = z.infer<typeof couponInput>;
