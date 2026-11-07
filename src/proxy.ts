import createMiddleware from "next-intl/middleware";
import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { recordAccess } from "./features/access-log";
import { routing } from "./i18n/routing";
import { REQUEST_ID_HEADER } from "./lib/request-id";

const handleI18n = createMiddleware(routing);

// docs/16 §3: toda requisição ganha um requestId, repassado à app e devolvido ao cliente.
// Um x-request-id vindo de fora é ignorado (o cliente poderia forjar ids de outros).
export default function proxy(request: NextRequest, event?: NextFetchEvent) {
  const requestId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.next({ request: { headers } })
    : handleI18n(new NextRequest(request, { headers })); // RN-81: idioma por Accept-Language / cookie

  response.headers.set(REQUEST_ID_HEADER, requestId);
  // docs/16 §9: log de acesso legal gravado depois da resposta, sem atrasar o usuário
  event?.waitUntil(
    recordAccess({
      headers: request.headers,
      method: request.method,
      pathname: request.nextUrl.pathname,
      requestId,
    }).catch(() => undefined), // última barreira: nada aqui pode virar rejeição sem tratamento
  );
  return response;
}

export const config = {
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
