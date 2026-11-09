// Importa o catálogo no formato do sistema de origem ({ info: [{ id, name, price, serviceCategoryId, … }] }).
// Idempotente: categoria e tag pelo slug, produto pelo externalId.
// #100: itens listados em groups.json viram um produto (pelo slug) com variantes (pelo externalId).
// Uso: pnpm catalog:import [arquivo.json]   (padrão: scripts/catalog/products.json; lê DATABASE_URL)
// O mapa id → categoria/tag fica em scripts/catalog/categories.json (o JSON de produtos não tem nomes).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { categories, products, productTags, productVariants, tags } from "../../src/db/schema.ts";
import { contentBySlug, toCatalog } from "./lib.mjs";

const here = (f) => resolve(import.meta.dirname, f);
const idBySlug = async (db, table, slug) =>
  (await db.select({ id: table.id }).from(table).where(eq(table.slug, slug)))[0].id;
// categoryRef/tagRef são ids da origem — viram category_id em place() e a tag principal em setPrimaryTag()
const withoutRefs = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !k.endsWith("Ref")));

// categorias pelo slug (#158: excluída no painel continua excluída — o upsert não devolve linha)
async function upsertCategories(db, map) {
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
        setWhere: isNull(categories.deletedAt), // #158: excluído no painel continua excluído
        set: { ...values, active: true, updatedAt: sql`now()` },
      })
      .returning({ id: categories.id });
    // excluída no painel: o upsert não devolve linha — usa o id existente (os produtos ainda apontam)
    catIds[ref] = row?.id ?? (await idBySlug(db, categories, c.slug));
  }
  return catIds;
}

// #160: tags pelo slug (o mesmo slug de categorias diferentes é a mesma tag). Excluída continua excluída.
async function upsertTags(db, map) {
  const tagIds = {};
  for (const [ref, t] of Object.entries(map.tags)) {
    const values = { slug: t.slug, name: t.name, sortOrder: t.sortOrder };
    const [row] = await db
      .insert(tags)
      .values(values)
      .onConflictDoUpdate({
        target: tags.slug,
        setWhere: isNull(tags.deletedAt),
        set: { ...values, updatedAt: sql`now()` },
      })
      .returning({ id: tags.id });
    tagIds[ref] = row?.id ?? (await idBySlug(db, tags, t.slug));
  }
  return tagIds;
}

// tag principal (posição 0) vinda da origem; as outras tags que o admin pôs ficam
async function setPrimaryTag(db, productId, tagId) {
  if (!tagId) return;
  await db.delete(productTags).where(and(eq(productTags.productId, productId), eq(productTags.position, 0)));
  await db
    .insert(productTags)
    .values({ productId, tagId, position: 0 })
    .onConflictDoUpdate({ target: [productTags.productId, productTags.tagId], set: { position: 0 } });
}

// tudo ou nada: um erro no meio (ex.: índice único) não deixa o catálogo meio importado
export const importCatalog = (db, file = here("products.json")) =>
  db.transaction((tx) => importInto(tx, file));

async function importInto(db, file) {
  const map = JSON.parse(readFileSync(here("categories.json"), "utf8"));
  const { info } = JSON.parse(readFileSync(file, "utf8"));
  const unknown = [...new Set(info.map((i) => String(i.serviceCategoryId)))].filter(
    (id) => !map.categories[id],
  );
  if (unknown.length) throw new Error(`categorias sem mapa em categories.json: ${unknown.join(", ")}`);

  const catIds = await upsertCategories(db, map);
  const tagIds = await upsertTags(db, map);

  const { groups } = JSON.parse(readFileSync(here("groups.json"), "utf8"));
  const catalog = toCatalog(info, groups);
  // #102: "Popular" só nos destaques escolhidos (a origem marca tudo como hotItem)
  const hot = new Set(map.hot); // sem a lista = nenhum
  for (const p of [...catalog.singles, ...catalog.groups]) p.hot = hot.has(p.slug);
  const place = (p) => ({
    categoryId: catIds[String(p.categoryRef)],
    region: "US", // RN-14: loja só US
    active: true,
  });
  for (const p of catalog.singles) {
    const values = { ...withoutRefs(p), ...place(p), optionAxes: [] };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.externalId,
        setWhere: isNull(products.deletedAt),
        set: { ...values, updatedAt: sql`now()` },
      })
      .returning({ id: products.id });
    if (row) await setPrimaryTag(db, row.id, tagIds[String(p.tagRef)]);
  }
  for (const g of catalog.groups) {
    const { variants, ...group } = g;
    const values = { ...withoutRefs(group), ...place(g), externalId: null };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.slug,
        setWhere: isNull(products.deletedAt),
        set: { ...values, updatedAt: sql`now()` },
      })
      .returning({ id: products.id });
    if (!row) continue; // #158: produto excluído no painel não volta pela importação
    await setPrimaryTag(db, row.id, tagIds[String(g.tagRef)]);
    for (const v of variants) {
      const vv = { ...v, productId: row.id, active: true };
      await db
        .insert(productVariants)
        .values(vv)
        .onConflictDoUpdate({ target: productVariants.externalId, set: { ...vv, updatedAt: sql`now()` } });
    }
    // variante que saiu do grupo no groups.json fica inativa (não apaga: pedidos apontam para ela)
    await db
      .update(productVariants)
      .set({ active: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(productVariants.productId, row.id),
          notInArray(
            productVariants.externalId,
            variants.map((v) => v.externalId),
          ),
        ),
      );
  }
  // produtos de importações anteriores (um por variante) saem da vitrine; ficam para carrinhos/pedidos antigos
  if (catalog.groupedIds.length)
    await db
      .update(products)
      .set({ active: false, updatedAt: sql`now()` })
      .where(inArray(products.externalId, catalog.groupedIds));
  const all = [...catalog.singles, ...catalog.groups];
  // #136: galeria, descrição detalhada e FAQ. Só os produtos listados em content.json são tocados
  // (o que o dashboard editar nos outros fica — #137)
  const content = contentBySlug(
    JSON.parse(readFileSync(here("content.json"), "utf8")).content,
    new Set(all.map((p) => p.slug)),
    (src) => existsSync(resolve(import.meta.dirname, "../../public", `.${src}`)),
  );
  for (const [slug, c] of Object.entries(content))
    await db
      .update(products)
      .set({ ...c, updatedAt: sql`now()` })
      .where(eq(products.slug, slug));
  return {
    categories: Object.keys(catIds).length,
    tags: new Set(Object.values(tagIds)).size,
    products: all.length,
    variants: catalog.groupedIds.length,
    onRequest: all.filter((r) => r.priceOnRequest).length,
    withContent: Object.keys(content).length,
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
    `catálogo: ${r.categories} categorias, ${r.tags} tags, ${r.products} produtos, ${r.variants} variantes (${r.onRequest} sob consulta), ${r.withContent} com página detalhada`,
  );
  await db.$client.end();
}
