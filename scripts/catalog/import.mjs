// Importa o catálogo no formato do sistema de origem ({ info: [{ id, name, price, serviceCategoryId, … }] }).
// Idempotente: categoria pelo slug, subcategoria por (categoria, slug), produto pelo externalId.
// #100: itens listados em groups.json viram um produto (pelo slug) com variantes (pelo externalId).
// Uso: pnpm catalog:import [arquivo.json]   (padrão: scripts/catalog/products.json; lê DATABASE_URL)
// O mapa id → categoria/subcategoria fica em scripts/catalog/categories.json (o JSON de produtos não tem nomes).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { categories, products, productVariants, subcategories } from "../../src/db/schema.ts";
import { toCatalog } from "./lib.mjs";

const here = (f) => resolve(import.meta.dirname, f);
// categoryRef/subcategoryRef são ids da origem — viram category_id/subcategory_id em place()
const withoutRefs = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.endsWith("Ref")));

export async function importCatalog(db, file = here("products.json")) {
  const map = JSON.parse(readFileSync(here("categories.json"), "utf8"));
  const { info } = JSON.parse(readFileSync(file, "utf8"));
  const unknown = [...new Set(info.map((i) => String(i.serviceCategoryId)))].filter(
    (id) => !map.categories[id],
  );
  if (unknown.length) throw new Error(`categorias sem mapa em categories.json: ${unknown.join(", ")}`);

  const catIds = {};
  for (const [ref, c] of Object.entries(map.categories)) {
    const values = {
      slug: c.slug,
      kind: c.kind,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
    };
    const [row] = await db
      .insert(categories)
      .values({ ...values, active: true })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { ...values, active: true, updatedAt: sql`now()` },
      })
      .returning({ id: categories.id });
    catIds[ref] = row.id;
  }
  const subIds = {};
  for (const [ref, s] of Object.entries(map.subcategories)) {
    const values = { categoryId: catIds[s.category], slug: s.slug, name: s.name, sortOrder: s.sortOrder };
    const [row] = await db
      .insert(subcategories)
      .values(values)
      .onConflictDoUpdate({
        target: [subcategories.categoryId, subcategories.slug],
        set: { name: s.name, sortOrder: s.sortOrder, updatedAt: sql`now()` },
      })
      .returning({ id: subcategories.id });
    subIds[ref] = row.id;
  }

  const { groups } = JSON.parse(readFileSync(here("groups.json"), "utf8"));
  const catalog = toCatalog(info, groups);
  const place = (p) => ({
    categoryId: catIds[String(p.categoryRef)],
    subcategoryId: p.subcategoryRef === null ? null : (subIds[String(p.subcategoryRef)] ?? null),
    region: "US", // RN-14: loja só US
    active: true,
  });
  for (const p of catalog.singles) {
    const values = { ...withoutRefs(p), ...place(p), optionAxes: [] };
    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.externalId, set: { ...values, updatedAt: sql`now()` } });
  }
  for (const g of catalog.groups) {
    const { variants, ...group } = g;
    const values = { ...withoutRefs(group), ...place(g), externalId: null };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: products.id });
    for (const v of variants) {
      const vv = { ...v, productId: row.id, active: true };
      await db
        .insert(productVariants)
        .values(vv)
        .onConflictDoUpdate({ target: productVariants.externalId, set: { ...vv, updatedAt: sql`now()` } });
    }
  }
  // produtos de importações anteriores (um por variante) saem da vitrine; ficam para carrinhos/pedidos antigos
  if (catalog.groupedIds.length)
    await db
      .update(products)
      .set({ active: false, updatedAt: sql`now()` })
      .where(inArray(products.externalId, catalog.groupedIds));
  const all = [...catalog.singles, ...catalog.groups];
  return {
    categories: Object.keys(catIds).length,
    subcategories: Object.keys(subIds).length,
    products: all.length,
    variants: catalog.groupedIds.length,
    onRequest: all.filter((r) => r.priceOnRequest).length,
  };
}

// produto do item de origem — direto ou, se o item virou variante (#100), o produto do grupo
export async function productIdByExternal(db, externalId) {
  const [v] = await db
    .select({ id: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.externalId, externalId));
  if (v) return v.id;
  const [p] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.externalId, externalId)));
  return p?.id;
}

if (import.meta.main) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não configurada.");
    process.exit(1);
  }
  const db = drizzle(process.env.DATABASE_URL);
  const r = await importCatalog(db, process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log(
    `catálogo: ${r.categories} categorias, ${r.subcategories} subcategorias, ${r.products} produtos, ${r.variants} variantes (${r.onRequest} sob consulta)`,
  );
  await db.$client.end();
}
