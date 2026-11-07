import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts, categories, products, productVariants, raidSlots } from "@/db/schema";
import type { ItemOptions } from "@/features/pricing/rules";

export async function createCart(): Promise<string> {
  const [row] = await db.insert(carts).values({}).returning({ id: carts.id });
  return row!.id;
}

export async function cartExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.id, id));
  return !!row;
}

export async function insertItem(
  cartId: string,
  item: { productId: string; quantity: number; options: ItemOptions; slotId?: string; variantId?: string },
) {
  await db.insert(cartItems).values({
    cartId,
    productId: item.productId,
    quantity: item.quantity,
    options: item.options,
    raidSlotId: item.slotId ?? null,
    variantId: item.variantId ?? null,
  });
}

// IDOR: só remove item do carrinho do próprio cookie (docs/09 caso 2)
export async function deleteItem(cartId: string, itemId: string): Promise<boolean> {
  const removed = await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .returning({ id: cartItems.id });
  return removed.length > 0;
}

export async function clearCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ couponCode: null, updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function getCartCoupon(cartId: string): Promise<string | null> {
  const [r] = await db.select({ code: carts.couponCode }).from(carts).where(eq(carts.id, cartId));
  return r?.code ?? null;
}

export async function setCartCoupon(cartId: string, code: string | null) {
  await db.update(carts).set({ couponCode: code, updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function countItems(cartId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(cartItems).where(eq(cartItems.cartId, cartId));
  return row?.n ?? 0;
}

// RN-20: preço atual do produto, lido do banco a cada exibição (o pedido congela no checkout)
export async function listItems(cartId: string) {
  return db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      options: cartItems.options,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      productActive: products.active,
      basePriceCents: products.priceUsdtCents,
      // #100: preço da variante (quando o produto tem eixos) e se ela ainda vale para este produto
      hasVariants: sql<boolean>`jsonb_array_length(${products.optionAxes}) > 0`,
      variantId: cartItems.variantId,
      variantPriceCents: productVariants.priceUsdtCents,
      variantOk: sql<boolean>`coalesce(${productVariants.active} and not ${productVariants.priceOnRequest}
        and ${productVariants.productId} = ${products.id}, false)`,
      addons: products.addons,
      priceOnRequest: products.priceOnRequest,
      maxQuantity: products.maxQuantity,
      // RN-16: o produto tem horário futuro ativo? (item sem horário deixa de valer — #94)
      hasSlots: sql<boolean>`exists (select 1 from ${raidSlots} s where s.product_id = ${products.id}
        and s.active and s.starts_at > now())`,
      unit: products.unit,
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryKind: categories.kind,
      slotId: cartItems.raidSlotId,
      slotStartsAt: raidSlots.startsAt,
      slotCapacity: raidSlots.capacity,
      slotReserved: raidSlots.reserved,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(raidSlots, eq(cartItems.raidSlotId, raidSlots.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));
}

// #100: variante ativa e com preço DESTE produto (id vindo do formulário não é confiável)
export async function getVariantForProduct(variantId: string, productId: string) {
  const [row] = await db
    .select({
      id: productVariants.id,
      options: productVariants.options,
      price: productVariants.priceUsdtCents,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId),
        eq(productVariants.active, true),
        eq(productVariants.priceOnRequest, false),
      ),
    );
  return row ?? null;
}

export async function getSlotForProduct(slotId: string, productId: string) {
  const [row] = await db
    .select({ startsAt: raidSlots.startsAt, capacity: raidSlots.capacity, reserved: raidSlots.reserved })
    .from(raidSlots)
    .where(and(eq(raidSlots.id, slotId), eq(raidSlots.productId, productId), eq(raidSlots.active, true)));
  return row ?? null;
}
