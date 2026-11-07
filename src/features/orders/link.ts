import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const DEV_SECRET = "dev-order-link-secret-only-for-local-and-tests"; // público: só vale em APP_ENV=local

function secret(): string {
  if (env.ORDER_LINK_SECRET) return env.ORDER_LINK_SECRET;
  if (env.APP_ENV === "local") return DEV_SECRET;
  throw new Error("ORDER_LINK_SECRET ausente fora de local"); // env.ts já impede; defesa extra
}

// Link do pedido sem conta (RN-01; docs/04 rotas): /pedido/[id]?t=<assinatura do id>
export const orderToken = (orderId: string) =>
  createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url");

export function isOrderToken(orderId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(orderToken(orderId));
  const got = Buffer.from(token);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export const orderPath = (locale: string, orderId: string) =>
  `/${locale}/pedido/${orderId}?t=${orderToken(orderId)}`;
