import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, raidSlots } from "@/db/schema";

const slotColumns = {
  id: raidSlots.id,
  startsAt: raidSlots.startsAt,
  capacity: raidSlots.capacity,
  reserved: raidSlots.reserved,
  productId: products.id,
  productSlug: products.slug,
  productName: products.name,
  priceUsdtCents: products.priceUsdtCents,
  categorySlug: categories.slug,
};

export type RaidSlot = Awaited<ReturnType<typeof listUpcomingSlots>>[number];

const upcoming = () =>
  and(
    gt(raidSlots.startsAt, new Date()),
    eq(raidSlots.active, true),
    eq(products.active, true),
    eq(categories.active, true),
  );

// RN-16: próximos horários, do mais cedo ao mais tarde
export async function listUpcomingSlots(filter: { categorySlug?: string; limit?: number }) {
  const query = db
    .select(slotColumns)
    .from(raidSlots)
    .innerJoin(products, eq(raidSlots.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(upcoming(), ...(filter.categorySlug ? [eq(categories.slug, filter.categorySlug)] : [])))
    .orderBy(asc(raidSlots.startsAt));
  return filter.limit ? query.limit(filter.limit) : query;
}

export async function listSlotsForProduct(productSlug: string) {
  return db
    .select(slotColumns)
    .from(raidSlots)
    .innerJoin(products, eq(raidSlots.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(upcoming(), eq(products.slug, productSlug)))
    .orderBy(asc(raidSlots.startsAt));
}
