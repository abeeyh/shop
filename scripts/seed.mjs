// Catálogo inicial para desenvolvimento, homologação e E2E (no app real o admin cadastra — RN-13, RN-19).
// Gold fica aqui; o resto é o catálogo real importado de scripts/catalog (#94).
// Idempotente: atualiza pelo slug. Uso: pnpm db:seed (lê DATABASE_URL; .env.local se existir).
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, gt, sql } from "drizzle-orm";
import { categories, products, raidSlots } from "../src/db/schema.ts";
import { importCatalog, productIdByExternal } from "./catalog/import.mjs";

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
];

// [slug, categoria, região, nome, centavos de USDT, unidade, vendas, descrição]
const PRODUCTS = [
  ["gold-us", "gold", "US", "Gold — US realms", 45, "per_1k_gold", 980, "Delivered by mail within 2 hours."],
  ["gold-us-express", "gold", "US", "Gold — US express", 55, "per_1k_gold", 120, "Delivery within 1 hour."],
];
// demonstração antiga (antes do #94: calculadora de M+ e loot de raid) — sai da vitrine, fica nos pedidos
const RETIRED = [
  "raid-normal-us",
  "raid-heroic-us",
  "raid-mythic-us",
  "mplus-us",
  "mplus-bundle-us",
  "mplus-15-us",
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
    hot: slug === "gold-us", // destaque na home junto dos populares do catálogo (#94)
  };
  await db
    .insert(products)
    .values(values)
    .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } });
}
for (const slug of RETIRED)
  await db
    .update(products)
    .set({ active: false, updatedAt: sql`now()` })
    .where(eq(products.slug, slug));

const imported = await importCatalog(db);

// Agenda (RN-16): só dois produtos de raid têm horário fixo (o resto agenda com o suporte — #94).
// Próximas 4 noites às 01:00 UTC (noite nos EUA). Só insere se não há horários futuros (não apaga
// horário que um pedido possa referenciar). O 1º horário da Normal sai esgotado (RN-11).
const DAY = 24 * 60 * 60 * 1000;
const slotTimes = (hourUtc) => {
  const base = new Date();
  base.setUTCHours(hourUtc, 0, 0, 0);
  if (base.getTime() < Date.now() + 2 * 60 * 60 * 1000) base.setTime(base.getTime() + DAY);
  return [0, 1, 2, 3].map((d) => new Date(base.getTime() + d * DAY));
};
const SCHEDULED = [
  { externalId: 397, soldOutFirst: false }, // Venomous Abyss 8/8 SAVED HEROIC
  { externalId: 395, soldOutFirst: true }, // Venomous Abyss SAVED NORMAL
];
let slots = 0;
for (const { externalId, soldOutFirst } of SCHEDULED) {
  const productId = await productIdByExternal(db, externalId);
  const future = await db
    .select({ id: raidSlots.id })
    .from(raidSlots)
    .where(and(eq(raidSlots.productId, productId), gt(raidSlots.startsAt, new Date())));
  if (future.length) continue;
  const rows = slotTimes(1).map((startsAt, i) => {
    const capacity = 10;
    return { productId, startsAt, capacity, reserved: soldOutFirst && i === 0 ? capacity : i };
  });
  await db.insert(raidSlots).values(rows);
  slots += rows.length;
}
console.log(
  `seed: gold (${PRODUCTS.length} produtos) + catálogo (${imported.categories} categorias, ${imported.products} produtos), ${slots} horários novos`,
);
await db.$client.end();
