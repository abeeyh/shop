import type { BadgeTone } from "@/components/atoms/StatusBadge";

// RF-07 (doc 17) + RN-22: estado da promoção/cupom pela janela [início, fim) e pelo "ativo"
export type DiscountState = "inactive" | "scheduled" | "live" | "expired";

export function discountState(
  d: { active: boolean; startsAt: Date; endsAt: Date },
  now = new Date(),
): DiscountState {
  if (!d.active) return "inactive";
  if (now < d.startsAt) return "scheduled";
  if (now >= d.endsAt) return "expired";
  return "live";
}

export const DISCOUNT_TONE: Record<DiscountState, BadgeTone> = {
  inactive: "neutral",
  scheduled: "info",
  live: "success",
  expired: "neutral",
};
