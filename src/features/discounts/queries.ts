import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, count, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { couponRedemptions, coupons, promotions } from "@/db/schema";
import type { Coupon, Promotion } from "@/features/pricing/rules";
import { normalizeCode } from "./rules";

export { canonicalEmail, normalizeCode } from "./rules";

// RN-22: promoções valendo agora (poucas linhas; o melhor desconto é escolhido em rules.ts)
export async function activePromotions(now = new Date()): Promise<Promotion[]> {
  return db
    .select()
    .from(promotions)
    .where(and(eq(promotions.active, true), lte(promotions.startsAt, now), gt(promotions.endsAt, now)));
}

export async function couponByCode(code: string) {
  const [c] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizeCode(code)));
  return (c ?? null) as
    (Coupon & { maxUses: number | null; maxUsesPerEmail: number | null; code: string }) | null;
}

// RN-27: reservados + usados contam para os limites
export async function couponUses(couponId: string, email?: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(couponRedemptions)
    .where(
      and(
        eq(couponRedemptions.couponId, couponId),
        inArray(couponRedemptions.status, ["reserved", "used"]),
        email ? eq(couponRedemptions.email, email) : undefined,
      ),
    );
  return r?.n ?? 0;
}
