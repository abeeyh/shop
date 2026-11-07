// Catálogo inicial para desenvolvimento, homologação e E2E (no app real o admin cadastra — RN-13, RN-19).
// Idempotente: atualiza pelo slug. Uso: pnpm db:seed (lê DATABASE_URL; .env.local se existir).
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, gt, sql } from "drizzle-orm";
import { categories, products, raidSlots } from "../src/db/schema.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}
const db = drizzle(process.env.DATABASE_URL);

const CATEGORIES = [
  {
    slug: "gold",
    kind: "gold",
    name: "Gold",
    sortOrder: 1,
    description: "Fast, safe gold delivery by mail or face to face.",
  },
  {
    slug: "raids",
    kind: "raid",
    name: "Raids",
    sortOrder: 2,
    description: "Current raid in Normal, Heroic and Mythic, with fixed schedules.",
  },
  {
    slug: "mythic-plus",
    kind: "dungeon",
    name: "Mythic+",
    sortOrder: 3,
    description: "Keys from +2 to +15, timed or untimed, single or bundles.",
  },
];

// [slug, categoria, região, nome, centavos de USDT, unidade, vendas, descrição]
const PRODUCTS = [
  ["gold-us", "gold", "US", "Gold — US realms", 45, "per_1k_gold", 980, "Delivered by mail within 2 hours."],
  ["gold-us-express", "gold", "US", "Gold — US express", 55, "per_1k_gold", 120, "Delivery within 1 hour."],
  ["raid-normal-us", "raids", "US", "Current raid — Normal", 3900, null, 310, "Full clear, self-play."],
  ["raid-heroic-us", "raids", "US", "Current raid — Heroic", 7900, null, 640, "Full clear, self-play."],
  [
    "raid-mythic-us",
    "raids",
    "US",
    "Current raid — Mythic (1 boss)",
    14900,
    null,
    90,
    "One Mythic boss, self-play.",
  ],
  ["mplus-us", "mythic-plus", "US", "Mythic+ key", 1200, null, 520, "One key, level of your choice."],
  [
    "mplus-bundle-us",
    "mythic-plus",
    "US",
    "Mythic+ — 4 keys bundle",
    4200,
    null,
    260,
    "Four keys of the same level, best value.",
  ],
  [
    "mplus-15-us",
    "mythic-plus",
    "US",
    "Mythic+ +15 timed",
    2900,
    null,
    75,
    "High key, timed, for the seasonal achievement.",
  ],
];

const catIds = {};
for (const c of CATEGORIES) {
  const [row] = await db
    .insert(categories)
    .values(c)
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: c.name,
        kind: c.kind,
        sortOrder: c.sortOrder,
        description: c.description,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: categories.id });
  catIds[c.slug] = row.id;
}
for (const [slug, cat, region, name, price, unit, sales, description] of PRODUCTS) {
  const values = {
    slug,
    categoryId: catIds[cat],
    region,
    name,
    priceUsdtCents: price,
    unit,
    salesCount: sales,
    description,
  };
  await db
    .insert(products)
    .values(values)
    .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } });
}
// Agenda (RN-16): próximas 4 noites — 01:00 UTC (noite nos EUA) e 19:00 UTC (noite na Europa).
// Só insere se o produto não tem horários futuros (não apaga horário que um pedido possa referenciar).
const DAY = 24 * 60 * 60 * 1000;
const slotTimes = (hourUtc) => {
  const base = new Date();
  base.setUTCHours(hourUtc, 0, 0, 0);
  if (base.getTime() < Date.now() + 2 * 60 * 60 * 1000) base.setTime(base.getTime() + DAY);
  return [0, 1, 2, 3].map((d) => new Date(base.getTime() + d * DAY));
};
let slots = 0;
for (const [slug, cat, region] of PRODUCTS) {
  if (cat !== "raids") continue;
  const [p] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
  const future = await db
    .select({ id: raidSlots.id })
    .from(raidSlots)
    .where(and(eq(raidSlots.productId, p.id), gt(raidSlots.startsAt, new Date())));
  if (future.length) continue;
  const times = slotTimes(region === "US" ? 1 : 19);
  // o primeiro horário da Normal US sai esgotado, para a vitrine mostrar o estado (RN-11)
  const rows = times.map((startsAt, i) => {
    const capacity = slug.includes("mythic") ? 4 : 10;
    const reserved = slug === "raid-normal-us" && i === 0 ? capacity : i;
    return { productId: p.id, startsAt, capacity, reserved };
  });
  await db.insert(raidSlots).values(rows);
  slots += rows.length;
}
console.log(`seed: ${CATEGORIES.length} categorias, ${PRODUCTS.length} produtos, ${slots} horários novos`);
await db.$client.end();
