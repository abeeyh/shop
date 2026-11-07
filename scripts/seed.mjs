// Catálogo inicial para desenvolvimento, homologação e E2E (no app real o admin cadastra — RN-13, RN-19).
// Idempotente: atualiza pelo slug. Uso: pnpm db:seed (lê DATABASE_URL; .env.local se existir).
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { categories, products } from "../src/db/schema.ts";

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
  ["gold-eu", "gold", "EU", "Gold — EU realms", 38, "per_1k_gold", 870, "Delivered by mail within 2 hours."],
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
  ["raid-normal-eu", "raids", "EU", "Current raid — Normal", 3700, null, 280, "Full clear, self-play."],
  ["raid-heroic-eu", "raids", "EU", "Current raid — Heroic", 7500, null, 590, "Full clear, self-play."],
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
  ["mplus-eu", "mythic-plus", "EU", "Mythic+ key", 1100, null, 470, "One key, level of your choice."],
  [
    "mplus-bundle-eu",
    "mythic-plus",
    "EU",
    "Mythic+ — 4 keys bundle",
    3900,
    null,
    210,
    "Four keys of the same level, best value.",
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
console.log(`seed: ${CATEGORIES.length} categorias, ${PRODUCTS.length} produtos`);
await db.$client.end();
