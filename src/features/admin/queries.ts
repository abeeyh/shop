import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, categories, couponRedemptions, coupons, products, promotions, users } from "@/db/schema";
import { saveAudited } from "./audit";
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

export const saveProductRow = (staffId: string, id: string | null, v: ProductInput, unit: string | null) => {
  const { price, ...rest } = v;
  const row = { ...rest, priceUsdtCents: price, unit };
  return saveAudited(
    "product",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(products).where(eq(products.id, key)))[0],
    async (tx) => {
      const [r] = id
        ? await tx
            .update(products)
            .set({ ...row, updatedAt: new Date() })
            .where(eq(products.id, id))
            .returning({ id: products.id })
        : await tx.insert(products).values(row).returning({ id: products.id });
      return r?.id;
    },
  );
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

// lista de auditoria (mais recentes primeiro)
export const listAudit = (limit = 100) =>
  db
    .select({
      id: auditLog.id,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      action: auditLog.action,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      staffEmail: users.email,
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.staffId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
