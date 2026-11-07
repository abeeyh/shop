import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, raidSlots } from "@/db/schema";
import { PAGE_SIZE, type Filters } from "./schemas";

const SIMILARITY = 0.3; // RN-100: limiar do pg_trgm (tolera erro de digitação: "mithic" → "Mythic")

// RN-100 a RN-103: busca e filtros aplicados no servidor; uma consulta com o total da página
export async function searchProducts(f: Filters) {
  const text = sql`${products.name} || ' ' || ${categories.name} || ' ' || ${products.description}`;
  const score = f.q
    ? sql<number>`(2 * word_similarity(${f.q}, ${products.name}) + word_similarity(${f.q}, ${categories.name}) + 0.5 * word_similarity(${f.q}, ${products.description}))`
    : sql<number>`0`;
  // RN-11: raid só está disponível se tem horário futuro com vaga; gold e M+ sempre
  const bookable = or(
    sql`${categories.kind} <> 'raid'`,
    sql`exists (select 1 from ${raidSlots} s where s.product_id = ${products.id} and s.active
               and s.starts_at > now() and s.reserved < s.capacity)`,
  );
  const conditions: (SQL | undefined)[] = [
    eq(products.active, true),
    eq(categories.active, true),
    f.region === "all" ? undefined : eq(products.region, f.region),
    f.categories.length ? inArray(categories.slug, f.categories) : undefined,
    f.min !== undefined ? gte(products.priceUsdtCents, f.min * 100) : undefined,
    f.max !== undefined ? lte(products.priceUsdtCents, f.max * 100) : undefined,
    f.available ? bookable : undefined,
    f.q ? sql`word_similarity(${f.q}, ${text}) > ${SIMILARITY}` : undefined,
  ];
  const order = {
    relevance: [desc(score), desc(products.salesCount)],
    best: [desc(products.salesCount), asc(products.name)],
    "price-asc": [asc(products.priceUsdtCents), asc(products.name)],
    "price-desc": [desc(products.priceUsdtCents), asc(products.name)],
  }[f.sort];

  const rows = await db
    .select({
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
      available: sql<boolean>`${bookable}`,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((f.page - 1) * PAGE_SIZE);

  return { items: rows, total: rows[0]?.total ?? 0 };
}
