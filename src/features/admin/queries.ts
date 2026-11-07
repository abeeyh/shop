import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, couponRedemptions, coupons, products, promotions } from "@/db/schema";
import type { CategoryInput, CouponInput, ProductInput, PromotionInput } from "./schemas";

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
      region: products.region,
      description: products.description,
      imageUrl: products.imageUrl,
      priceUsdtCents: products.priceUsdtCents,
      active: products.active,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(products.name));
}

export async function activeProductCount(categoryId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.active, true)));
  return r?.n ?? 0;
}

export async function categoryKindOf(id: string) {
  const [r] = await db.select({ kind: categories.kind }).from(categories).where(eq(categories.id, id));
  return r?.kind ?? null;
}

export async function saveCategoryRow(id: string | null, v: CategoryInput) {
  if (id)
    await db
      .update(categories)
      .set({ ...v, updatedAt: new Date() })
      .where(eq(categories.id, id));
  else await db.insert(categories).values(v);
}

export async function saveProductRow(id: string | null, v: ProductInput, unit: string | null) {
  const row = { ...v, priceUsdtCents: v.price, unit };
  if (id)
    await db
      .update(products)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(products.id, id));
  else await db.insert(products).values(row);
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

export async function savePromotionRow(id: string | null, v: PromotionInput) {
  if (id)
    await db
      .update(promotions)
      .set({ ...v, updatedAt: new Date() })
      .where(eq(promotions.id, id));
  else await db.insert(promotions).values(v);
}

export async function saveCouponRow(id: string | null, v: CouponInput) {
  if (id)
    await db
      .update(coupons)
      .set({ ...v, updatedAt: new Date() })
      .where(eq(coupons.id, id));
  else await db.insert(coupons).values(v);
}
