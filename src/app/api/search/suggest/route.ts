import { headers } from "next/headers";
import { suggest } from "@/features/catalog/suggest";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";

const EMPTY = { categories: [], products: [] };

// #110 / RN-100: sugestões da busca do cabeçalho enquanto o cliente digita (2+ caracteres).
// Limite próprio por IP (RN-105): cada tecla vira uma consulta (o componente espera 200 ms entre elas).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const locale = routing.locales.find((l) => l === url.searchParams.get("locale")) ?? routing.defaultLocale;
  const h = await headers();
  const ip = clientIp(h, env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const limit = await rateLimit({ key: `suggest:${rateLimitKey(ip)}`, ...RATE_LIMITS.suggest });
  if (!limit.allowed) return tooManyRequests(limit, getRequestId(h));
  const body = q.length >= 2 ? await suggest(locale, q) : EMPTY;
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
