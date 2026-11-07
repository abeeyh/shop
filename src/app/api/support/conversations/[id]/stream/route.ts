import { channelOf } from "@/features/support/chat";
import { canAccessConversation } from "@/features/support/access";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { subscribe } from "@/lib/pubsub";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

const PING_MS = 25_000; // proxy/CDN não corta a conexão parada (docs/04 — Chat)
const MAX_MS = 10 * 60_000; // fecha e o EventSource reconecta, passando de novo pela permissão

// SSE da conversa: avisa mensagem nova e mudança de status; o conteúdo já está no banco
export async function GET(request: Request, ctx: RouteContext<"/api/support/conversations/[id]/stream">) {
  const { id } = await ctx.params;
  // aberturas por IP limitadas (cada conexão ocupa socket e listener); Valkey fora = recusa
  const ip = clientIp(request.headers, env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const limit = await rateLimit({ key: `sse:${rateLimitKey(ip)}`, ...RATE_LIMITS.sse, failClosed: true });
  if (!limit.allowed) return new Response(null, { status: 429 });
  if (!(await canAccessConversation(id))) return new Response(null, { status: 404 });
  const encoder = new TextEncoder();
  let cleanup = () => undefined as void;
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send("retry: 3000\n\n");
      const unsubscribe = subscribe(channelOf(id), (message) => send(`data: ${message}\n\n`));
      // RN-05: a cada ping confere de novo (equipe desativada ou sessão vencida para de receber)
      const ping = setInterval(() => {
        canAccessConversation(id)
          .then((ok) => (ok ? send(": ping\n\n") : cleanup()))
          .catch(() => cleanup());
      }, PING_MS);
      const max = setTimeout(() => cleanup(), MAX_MS);
      cleanup = () => {
        clearInterval(ping);
        clearTimeout(max);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // já fechado
        }
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
