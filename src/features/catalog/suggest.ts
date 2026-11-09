import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { activePromotions } from "@/features/discounts/queries";
import { categoryHref, formatUsdt, productHref, promoPrice } from "./format";

const SIMILARITY = 0.3; // RN-100: mesma tolerância a erro de digitação da busca completa
const MAX_PRODUCTS = 6;
const MAX_CATEGORIES = 3;

// ILIKE trata % _ \ como curingas: o que o cliente digita é texto, não padrão
const literal = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export type Suggestions = {
  categories: { name: string; href: string }[];
  products: { name: string; href: string; category: string; kind: string; price: string | null }[];
};

// #110: sugestões enquanto o cliente digita ("ven" → Venomous Abyss). Começo do nome vem primeiro,
// depois "contém" e por fim parecidos (pg_trgm). Só ativos e visíveis, como a vitrine (RN-19).
export async function suggest(locale: string, q: string): Promise<Suggestions> {
  const like = `%${literal(q)}%`;
  const prefix = `${literal(q)}%`;
  const nameHit = or(
    sql`${products.name} ilike ${like}`,
    sql`${categories.name} ilike ${like}`,
    sql`word_similarity(${q}, ${products.name}) > ${SIMILARITY}`,
  );
  const [rows, cats, promos] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        categoryId: products.categoryId,
        categorySlug: categories.slug,
        categoryName: categories.name,
        kind: categories.kind,
        priceUsdtCents: products.priceUsdtCents,
        priceOnRequest: products.priceOnRequest,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.active, true), eq(categories.active, true), nameHit))
      .orderBy(
        desc(sql`${products.name} ilike ${prefix}`),
        desc(sql`${products.name} ilike ${like}`),
        desc(sql`word_similarity(${q}, ${products.name})`),
        desc(products.hot),
        asc(products.name),
      )
      .limit(MAX_PRODUCTS),
    db
      .select({ name: categories.name, slug: categories.slug })
      .from(categories)
      .where(
        and(
          eq(categories.active, true),
          or(
            sql`${categories.name} ilike ${like}`,
            sql`word_similarity(${q}, ${categories.name}) > ${SIMILARITY}`,
          ),
        ),
      )
      .orderBy(desc(sql`${categories.name} ilike ${prefix}`), asc(categories.sortOrder))
      .limit(MAX_CATEGORIES),
    activePromotions(),
  ]);
  return {
    categories: cats.map((c) => ({ name: c.name, href: categoryHref(locale, c.slug) })),
    products: rows.map((p) => ({
      name: p.name,
      href: productHref(locale, p),
      category: p.categoryName,
      kind: p.kind,
      price: p.priceOnRequest ? null : formatUsdt(locale, promoPrice(p, promos).cents), // RN-22, RN-106
    })),
  };
}
