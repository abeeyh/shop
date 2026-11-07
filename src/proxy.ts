import createMiddleware from "next-intl/middleware";
import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { recordAccess } from "./features/access-log";
import { routing } from "./i18n/routing";
import { clientIp } from "./lib/client-ip";
import { env } from "./lib/env";
import { RATE_LIMITS, rateLimit, tooManyRequests } from "./lib/rate-limit";
import { REQUEST_ID_HEADER } from "./lib/request-id";

const handleI18n = createMiddleware(routing);
const NOT_LIMITED = new Set(["/api/health"]); // monitor de uptime

// docs/16 §3: toda requisição ganha um requestId, repassado à app e devolvido ao cliente.
// Um x-request-id vindo de fora é ignorado (o cliente poderia forjar ids de outros).
export default async function proxy(request: NextRequest, event?: NextFetchEvent) {
  const requestId = crypto.randomUUID();
  const { pathname } = request.nextUrl;

  // docs/09 §2: rate limit compartilhado por IP antes de qualquer trabalho (inclusive o log de acesso)
  if (!NOT_LIMITED.has(pathname)) {
    const ip = clientIp(request.headers, env.CLIENT_IP_HEADER ?? "x-forwarded-for") ?? "unknown";
    const limited = await rateLimit({ key: `ip:${ip}`, ...RATE_LIMITS.request });
    if (!limited.allowed) {
      const blocked = tooManyRequests(limited, requestId);
      blocked.headers.set(REQUEST_ID_HEADER, requestId);
      return blocked;
    }
  }

  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const response = pathname.startsWith("/api/")
    ? NextResponse.next({ request: { headers } })
    : handleI18n(new NextRequest(request, { headers })); // RN-81: idioma por Accept-Language / cookie

  response.headers.set(REQUEST_ID_HEADER, requestId);
  // docs/16 §9: log de acesso legal gravado depois da resposta, sem atrasar o usuário
  event?.waitUntil(
    recordAccess({ headers: request.headers, method: request.method, pathname, requestId }).catch(
      () => undefined, // última barreira: nada aqui pode virar rejeição sem tratamento
    ),
  );
  return response;
}

export const config = {
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
