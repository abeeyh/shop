import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, promotions, raidSlots } from "@/db/schema";
import { PAGE_SIZE, type Filters } from "./schemas";

const SIMILARITY = 0.3; // RN-100: limiar do pg_trgm (tolera erro de digitação: "mithic" → "Mythic")

const text = sql`${products.name} || ' ' || ${categories.name} || ' ' || ${products.description}`;

// RN-11 / RN-16 (#94): produto com horários só está disponível se algum tem vaga; sem horário, a run é
// agendada com o suporte (sempre disponível). Sob consulta (RN-106) não vai ao carrinho.
const upcomingSlot = sql`select 1 from ${raidSlots} s where s.product_id = ${products.id} and s.active
             and s.starts_at > now()`;
const bookable = and(
  eq(products.priceOnRequest, false),
  or(sql`not exists (${upcomingSlot})`, sql`exists (${upcomingSlot} and s.reserved < s.capacity)`),
);
const priced = eq(products.priceOnRequest, false); // filtro de preço/promoção ignora "sob consulta"

// RN-102/RN-24: preço final = base − maior desconto valendo agora (mesma regra de pricing/rules.ts,
// no banco para ordenar e filtrar sem carregar tudo). Arredondamento igual ao Math.round para positivos.
const discount = sql`case when p.type = 'percent' then round(${products.priceUsdtCents} * p.value / 100.0) else p.value end`;
const finalPrice = sql<number>`(${products.priceUsdtCents} - coalesce((
  select max(least(${discount}, ${products.priceUsdtCents} - 1)) from ${promotions} p
  where p.active and p.starts_at <= now() and p.ends_at > now()
    and (p.scope = 'store' or (p.scope = 'category' and p.category_id = ${products.categoryId})
      or (p.scope = 'product' and p.product_id = ${products.id}))
), 0))`.mapWith(Number);

const filterConditions = (f: Filters): (SQL | undefined)[] => [
  eq(products.active, true),
  eq(categories.active, true),
  f.categories.length ? inArray(categories.slug, f.categories) : undefined,
  f.min !== undefined ? and(priced, gte(finalPrice, f.min * 100)) : undefined,
  f.max !== undefined ? and(priced, lte(finalPrice, f.max * 100)) : undefined,
  f.promo ? and(priced, sql`${finalPrice} < ${products.priceUsdtCents}`) : undefined,
  f.available ? bookable : undefined,
  f.q ? sql`word_similarity(${f.q}, ${text}) > ${SIMILARITY}` : undefined,
];

// RN-100 a RN-103: busca e filtros aplicados no servidor; uma consulta com o total da página
export async function searchProducts(f: Filters) {
  const score = f.q
    ? sql<number>`(2 * word_similarity(${f.q}, ${products.name}) + word_similarity(${f.q}, ${categories.name}) + 0.5 * word_similarity(${f.q}, ${products.description}))`
    : sql<number>`0`;
  const conditions = filterConditions(f);
  const order = {
    relevance: [desc(score), desc(products.salesCount)],
    best: [desc(products.salesCount), asc(products.name)],
    "price-asc": [asc(products.priceOnRequest), asc(finalPrice), asc(products.name)], // sob consulta no fim
    "price-desc": [asc(products.priceOnRequest), desc(finalPrice), asc(products.name)],
  }[f.sort];

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      priceUsdtCents: products.priceUsdtCents,
      unit: products.unit,
      salesCount: products.salesCount,
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryKind: categories.kind,
      categoryName: categories.name,
      priceOnRequest: products.priceOnRequest,
      hot: products.hot,
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
