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

export const KINDS = ["gold", "raid", "dungeon", "pvp", "achievement", "delve"] as const; // RN-13

// RN-13: categoria com tipo fixo; nome igual em todos os idiomas (RN-84)
export const categoryInput = z.object({
  name: text(60).min(2),
  slug,
  kind: z.enum(KINDS),
  description: text(500),
  imageUrl,
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

// #94: subcategoria opcional dentro da categoria (ex.: Raids → Heroic); slug único na categoria
export const subcategoryInput = z.object({
  categoryId: z.uuid(),
  name: text(60).min(2),
  slug,
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

// RN-17: um adicional por linha, "Nome | %" (ex.: "Armor Stack | 25"); nome único, 1–100%
const ADDON_LINE = /^(\S.{0,38}?\S)\s*\|\s*(\d{1,3})$/; // nome de 2–40 caracteres, sem espaço nas pontas
const addons = z
  .string()
  .max(1000)
  .transform((v) =>
    v
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().regex(ADDON_LINE)).max(10))
  .transform((lines) =>
    lines.map((l) => {
      const [, name, percent] = ADDON_LINE.exec(l)!;
      return { name: name!.trim(), percent: Number(percent) };
    }),
  )
  .refine((list) => list.every((a) => a.percent >= 1 && a.percent <= 100))
  .refine((list) => new Set(list.map((a) => a.name.toLowerCase())).size === list.length);

// #100: eixos de opção, um por linha — "Bosses | slider | 2/8, 3/8, 4/8" (slider anda na ordem escrita)
const AXIS_LINE = /^([^|]{1,30}?)\s*\|\s*(slider|boxes)\s*\|\s*(.+)$/;
const lines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const optionAxes = z
  .string()
  .max(2000)
  .transform(lines)
  .pipe(z.array(z.string().regex(AXIS_LINE)).max(4))
  .transform((ls) =>
    ls.map((l) => {
      const [, name, style, values] = AXIS_LINE.exec(l)!;
      const list = values!.split(",").map((x) => x.trim());
      return { name: name!.trim(), style: style as "slider" | "boxes", values: list };
    }),
  )
  .refine((axes) =>
    axes.every(
      (a) =>
        a.values.length >= 1 &&
        a.values.length <= 30 &&
        a.values.every((x) => x.length >= 1 && x.length <= 40) &&
        new Set(a.values).size === a.values.length,
    ),
  )
  .refine((axes) => new Set(axes.map((a) => a.name)).size === axes.length);

// #100: variantes, uma por linha — "Bosses=3/8; Tidebound Grotto=Included | 74.25 | nota"
// preço "-" = sob consulta (RN-106); nota opcional (até 160)
const VARIANT_LINE = /^(.+?)\s*\|\s*(-|\d{1,6}(?:\.\d{1,2})?)\s*(?:\|\s*(.{0,160}))?$/;
const variantLines = z
  .string()
  .max(20000)
  .transform(lines)
  .pipe(z.array(z.string().regex(VARIANT_LINE)).max(200))
  .transform((ls) =>
    ls.map((l) => {
      const [, opts, price, note] = VARIANT_LINE.exec(l)!;
      const options = Object.fromEntries(
        opts!.split(";").map((pair) => pair.split("=").map((x) => x.trim()) as [string, string]),
      );
      const onRequest = price === "-";
      return {
        options,
        priceUsdtCents: onRequest ? 1 : Math.round(Number(price) * 100),
        priceOnRequest: onRequest,
        note: (note ?? "").trim(),
      };
    }),
  );

// RN-19 / RN-12: preço digitado em USDT ("12.50") e gravado em centavos inteiros.
// RN-106: "sob consulta" dispensa o preço (guarda 1 centavo só como marcador — nunca é cobrado).
// #100: com variantes, o preço é o de cada combinação e o do produto vira o menor ("a partir de")
export const productInput = z
  .object({
    categoryId: z.uuid(),
    subcategoryId: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    name: text(80).min(2),
    slug,
    description: text(1000),
    imageUrl,
    price: z
      .string()
      .trim()
      .regex(/^(\d{1,6}(\.\d{1,2})?)?$/)
      .transform((v) => (v ? Math.round(Number(v) * 100) : 0)),
    priceOnRequest: checkbox,
    addons,
    optionAxes: optionAxes.prefault(""),
    variants: variantLines.prefault(""),
    maxQuantity: z.coerce.number().int().min(1).max(100),
    hot: checkbox,
    sortOrder: z.coerce.number().int().min(0).max(999),
    active: checkbox,
  })
  .superRefine((v, ctx) => {
    const issue = (path: string) => ctx.addIssue({ code: "custom", path: [path], message: path });
    if (v.optionAxes.length === 0) {
      if (v.variants.length) issue("variants");
      if (!v.priceOnRequest && v.price <= 0) issue("price");
      return;
    }
    // toda variante tem exatamente um valor válido por eixo, sem combinação repetida
    const names = v.optionAxes.map((a) => a.name);
    const ok = v.variants.every(
      (x) =>
        Object.keys(x.options).length === names.length &&
        v.optionAxes.every((a) => a.values.includes(x.options[a.name] ?? "")) &&
        (x.priceOnRequest || x.priceUsdtCents > 0),
    );
    const keys = v.variants.map((x) => names.map((n) => x.options[n]).join("\u0000"));
    if (!v.variants.length || !ok || new Set(keys).size !== keys.length) issue("variants");
  })
  .transform((v) => {
    // a ordem do slider é a ordem dos valores nos eixos
    const rank = (o: Record<string, string>) =>
      v.optionAxes.reduce((r, a) => r * 100 + a.values.indexOf(o[a.name]!), 0);
    const variants = v.variants.map((x) => ({ ...x, sortOrder: rank(x.options) }));
    if (!v.optionAxes.length)
      return { ...v, variants, price: v.priceOnRequest && v.price === 0 ? 1 : v.price };
    const priced = variants.filter((x) => !x.priceOnRequest).map((x) => x.priceUsdtCents);
    return {
      ...v,
      variants,
      price: priced.length ? Math.min(...priced) : 1,
      priceOnRequest: priced.length === 0,
    };
  });

export type CategoryInput = z.infer<typeof categoryInput>;
export type ProductInput = z.infer<typeof productInput>;
export type SubcategoryInput = z.infer<typeof subcategoryInput>;

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
