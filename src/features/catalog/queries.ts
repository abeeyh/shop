import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export type Region = "US" | "EU";

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  region: products.region,
  priceUsdtCents: products.priceUsdtCents,
  unit: products.unit,
  salesCount: products.salesCount,
  categorySlug: categories.slug,
  categoryKind: categories.kind,
  categoryName: categories.name,
};

export type CatalogProduct = Awaited<ReturnType<typeof listProducts>>[number];
export type CatalogCategory = Awaited<ReturnType<typeof listCategories>>[number];

// RN-13: só categorias ativas, na ordem definida pelo admin
export async function listCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      kind: categories.kind,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategory(slug: string) {
  const [row] = (await listCategories()).filter((c) => c.slug === slug);
  return row ?? null;
}

// RN-19: só produtos ativos de categorias ativas, da região escolhida (RN-14)
export async function listProducts(filter: { region: Region; categorySlug?: string; limit?: number }) {
  const conditions = [
    eq(products.active, true),
    eq(categories.active, true),
    eq(products.region, filter.region),
    ...(filter.categorySlug ? [eq(categories.slug, filter.categorySlug)] : []),
  ];
  const query = db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.salesCount), asc(products.name));
  return filter.limit ? query.limit(filter.limit) : query;
}

export async function getProduct(slug: string) {
  const [row] = await db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.active, true), eq(categories.active, true)));
  return row ?? null;
}
