import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, productTags, productVariants, tags } from "@/db/schema";
import { hasTag, primaryTagName, primaryTagSort, productTagNames } from "./tags-sql";

const productColumns = {
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
  addons: products.addons, // RN-17
  maxQuantity: products.maxQuantity,
  priceOnRequest: products.priceOnRequest, // RN-106
  hot: products.hot,
  optionAxes: products.optionAxes, // #100: com eixos, o preço do produto é o "a partir de"
  tags: productTagNames, // #160: várias tags; a principal agrupa a página da categoria
  primaryTag: primaryTagName,
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

// RN-19: só produtos ativos de categorias ativas (RN-14: loja só US).
// Na categoria: ordem do admin (tag principal → posição → nome), filtro opcional por tag (#160).
// Na home: populares e mais vendidos.
export async function listProducts(filter: { categorySlug?: string; limit?: number; tag?: string }) {
  const conditions = [
    eq(products.active, true),
    eq(categories.active, true),
    ...(filter.tag ? [hasTag(filter.tag)] : []),
    ...(filter.categorySlug ? [eq(categories.slug, filter.categorySlug)] : []),
  ];
  const order = filter.categorySlug
    ? [asc(primaryTagSort), asc(products.sortOrder), asc(products.name)]
    : [desc(products.hot), desc(products.salesCount), asc(products.name)];
  const query = db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(...order);
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

// #100: combinações ativas do produto, na ordem dos eixos (sob consulta aparece, mas não vai ao carrinho)
export async function listVariants(productId: string) {
  return db
    .select({
      id: productVariants.id,
      options: productVariants.options,
      priceUsdtCents: productVariants.priceUsdtCents,
      priceOnRequest: productVariants.priceOnRequest,
      note: productVariants.note,
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.active, true)))
    .orderBy(asc(productVariants.sortOrder));
}

// #136: conteúdo da página do serviço (fora do productColumns para não pesar as listas)
export async function getProductContent(productId: string) {
  const [row] = await db
    .select({ details: products.details, images: products.images, faq: products.faq })
    .from(products)
    .where(eq(products.id, productId));
  return row ?? { details: "", images: [], faq: [] };
}

// #160: tags usadas pelos produtos ativos da categoria (os chips de filtro), na ordem do admin
export async function listCategoryTags(categorySlug: string) {
  return db
    .selectDistinct({ slug: tags.slug, name: tags.name, sortOrder: tags.sortOrder })
    .from(productTags)
    .innerJoin(tags, eq(tags.id, productTags.tagId))
    .innerJoin(products, eq(products.id, productTags.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(categories.slug, categorySlug),
        eq(products.active, true),
        eq(tags.active, true),
        isNull(tags.deletedAt),
      ),
    )
    .orderBy(asc(tags.sortOrder), asc(tags.name));
}

// #164: produto em destaque do herói da home — o popular mais vendido que tem imagem (mostra a coisa real)
export async function getFeaturedProduct() {
  const [row] = await db
    .select({ ...productColumns, images: products.images })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.active, true),
        eq(categories.active, true),
        sql`jsonb_array_length(${products.images}) > 0`,
      ),
    )
    .orderBy(desc(products.hot), desc(products.salesCount), asc(products.name))
    .limit(1);
  return row ?? null;
}
