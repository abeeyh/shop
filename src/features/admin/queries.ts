import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  categories,
  couponRedemptions,
  coupons,
  products,
  productVariants,
  promotions,
  subcategories,
  users,
} from "@/db/schema";
import { ADMIN_PAGE_SIZE, type Cursor } from "@/lib/pagination";
import { saveAudited } from "./audit";
import type { CategoryInput, CouponInput, ProductInput, PromotionInput, SubcategoryInput } from "./schemas";

// Admin vê tudo, inclusive inativos (a vitrine filtra — RN-19)
export async function listAllCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      kind: categories.kind,
      description: categories.description,
      imageUrl: categories.imageUrl,
      sortOrder: categories.sortOrder,
      active: categories.active,
      activeProducts: db.$count(
        products,
        and(eq(products.categoryId, categories.id), eq(products.active, true)),
      ),
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listAllProducts() {
  return db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      categoryName: categories.name,
      name: products.name,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      priceUsdtCents: products.priceUsdtCents,
      subcategoryId: products.subcategoryId,
      addons: products.addons,
      optionAxes: products.optionAxes, // #100
      variants: sql<
        { options: Record<string, string>; priceUsdtCents: number; priceOnRequest: boolean; note: string }[]
      >`coalesce((select json_agg(json_build_object('options', v.options, 'priceUsdtCents', v.price_usdt_cents,
        'priceOnRequest', v.price_on_request, 'note', v.note) order by v.sort_order)
        from ${productVariants} v where v.product_id = ${products.id} and v.active), '[]'::json)`,
      maxQuantity: products.maxQuantity,
      priceOnRequest: products.priceOnRequest,
      hot: products.hot,
      sortOrder: products.sortOrder,
      active: products.active,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(products.sortOrder), asc(products.name));
}

export async function activeProductCount(categoryId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.active, true)));
  return r?.n ?? 0;
}

// #94: subcategorias com o nome da categoria (admin vê inativas também)
export const listAllSubcategories = () =>
  db
    .select({
      id: subcategories.id,
      categoryId: subcategories.categoryId,
      categoryName: categories.name,
      name: subcategories.name,
      slug: subcategories.slug,
      sortOrder: subcategories.sortOrder,
      active: subcategories.active,
    })
    .from(subcategories)
    .innerJoin(categories, eq(subcategories.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(subcategories.sortOrder), asc(subcategories.name));

export async function subcategoryCategoryOf(id: string) {
  const [r] = await db
    .select({ categoryId: subcategories.categoryId })
    .from(subcategories)
    .where(eq(subcategories.id, id));
  return r?.categoryId ?? null;
}

export async function categoryKindOf(id: string) {
  const [r] = await db.select({ kind: categories.kind }).from(categories).where(eq(categories.id, id));
  return r?.kind ?? null;
}

// slug repetido: o banco recusa (unique) e o formulário mostra no campo. O Drizzle embrulha o erro
// do Postgres em `cause`.
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// alvo da promoção/cupom inexistente (FK)
export function isForeignKeyViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23503" || e?.cause?.code === "23503";
}

export const listPromotions = () => db.select().from(promotions).orderBy(desc(promotions.endsAt));

// RN-27: usos = reservados + usados
export const listCoupons = () =>
  db
    .select({
      coupon: coupons,
      uses: db.$count(
        couponRedemptions,
        and(
          eq(couponRedemptions.couponId, coupons.id),
          inArray(couponRedemptions.status, ["reserved", "used"]),
        ),
      ),
    })
    .from(coupons)
    .orderBy(desc(coupons.endsAt));

// RN-71: toda gravação do dashboard passa por saveAudited (antes/depois na mesma transação)
export const saveCategoryRow = (staffId: string, id: string | null, v: CategoryInput) =>
  saveAudited(
    "category",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(categories).where(eq(categories.id, key)))[0],
    async (tx) => {
      const [r] = id
        ? await tx
            .update(categories)
            .set({ ...v, updatedAt: new Date() })
            .where(eq(categories.id, id))
            .returning({ id: categories.id })
        : await tx.insert(categories).values(v).returning({ id: categories.id });
      return r?.id;
    },
  );

export const saveSubcategoryRow = (staffId: string, id: string | null, v: SubcategoryInput) =>
  saveAudited(
    "subcategory",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(subcategories).where(eq(subcategories.id, key)))[0],
    async (tx) => {
      const [r] = id
        ? await tx
            .update(subcategories)
            .set({ ...v, updatedAt: new Date() })
            .where(eq(subcategories.id, id))
            .returning({ id: subcategories.id })
        : await tx.insert(subcategories).values(v).returning({ id: subcategories.id });
      return r?.id;
    },
  );

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// #100: a auditoria mostra as variantes junto do produto (o que o cliente paga mudou)
async function productSnapshot(tx: Tx, key: string) {
  const [p] = await tx.select().from(products).where(eq(products.id, key));
  if (!p) return undefined;
  const variants = await tx
    .select({
      options: productVariants.options,
      price: productVariants.priceUsdtCents,
      onRequest: productVariants.priceOnRequest,
      note: productVariants.note,
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, key), eq(productVariants.active, true)))
    .orderBy(asc(productVariants.sortOrder));
  return { ...p, variants };
}

// #100: grava as combinações pela chave (produto, opções); as que saíram da lista são desativadas — não
// apagadas, porque carrinhos e pedidos podem apontar para elas
async function syncVariants(tx: Tx, productId: string, list: ProductInput["variants"]) {
  for (const v of list) {
    const row = { ...v, productId, active: true };
    await tx
      .insert(productVariants)
      .values(row)
      .onConflictDoUpdate({
        target: [productVariants.productId, productVariants.options],
        set: { ...row, updatedAt: new Date() },
      });
  }
  const keep = list.map((v) => JSON.stringify(v.options));
  await tx
    .update(productVariants)
    .set({ active: false, updatedAt: new Date() })
    .where(
      and(
        eq(productVariants.productId, productId),
        // jsonb compara sem depender da ordem das chaves
        keep.length
          ? sql`${productVariants.options} not in (${sql.join(
              keep.map((k) => sql`${k}::jsonb`),
              sql`, `,
            )})`
          : undefined,
      ),
    );
}

export const saveProductRow = (staffId: string, id: string | null, v: ProductInput, unit: string | null) => {
  const { price, variants, ...rest } = v;
  const row = { ...rest, priceUsdtCents: price, unit };
  return saveAudited("product", staffId, id, productSnapshot, async (tx) => {
    const [r] = id
      ? await tx
          .update(products)
          .set({ ...row, updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning({ id: products.id })
      : await tx.insert(products).values(row).returning({ id: products.id });
    if (r) await syncVariants(tx, r.id, variants);
    return r?.id;
  });
};

export const savePromotionRow = (staffId: string, id: string | null, v: PromotionInput) =>
  saveAudited(
    "promotion",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(promotions).where(eq(promotions.id, key)))[0],
    async (tx) => {
      const [r] = id
        ? await tx
            .update(promotions)
            .set({ ...v, updatedAt: new Date() })
            .where(eq(promotions.id, id))
            .returning({ id: promotions.id })
        : await tx.insert(promotions).values(v).returning({ id: promotions.id });
      return r?.id;
    },
  );

export const saveCouponRow = (staffId: string, id: string | null, v: CouponInput) =>
  saveAudited(
    "coupon",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(coupons).where(eq(coupons.id, key)))[0],
    async (tx) => {
      const [r] = id
        ? await tx
            .update(coupons)
            .set({ ...v, updatedAt: new Date() })
            .where(eq(coupons.id, id))
            .returning({ id: coupons.id })
        : await tx.insert(coupons).values(v).returning({ id: coupons.id });
      return r?.id;
    },
  );

// RN-71 / #88: auditoria por cursor (mais recentes primeiro). Keyset em vez de OFFSET: a tabela só
// cresce. Busca uma linha a mais para saber se existe página seguinte.
export async function listAudit(before: Cursor | null, limit = ADMIN_PAGE_SIZE) {
  const rows = await db
    .select({
      id: auditLog.id,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      action: auditLog.action,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      staffEmail: users.email,
      cursorAt: sql<string>`to_char(${auditLog.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.staffId, users.id))
    .where(
      before
        ? sql`(${auditLog.createdAt}, ${auditLog.id}) < (${before.at}::timestamptz, ${before.id}::uuid)`
        : undefined,
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit + 1);
  return { rows: rows.slice(0, limit), more: rows.length > limit };
}
