import { channelOf } from "@/features/support/chat";
import { canAccessConversation } from "@/features/support/access";
import { subscribe } from "@/lib/pubsub";

const PING_MS = 25_000; // proxy/CDN não corta a conexão parada (docs/04 — Chat)

// SSE da conversa: avisa mensagem nova e mudança de status; o conteúdo já está no banco
export async function GET(request: Request, ctx: RouteContext<"/api/support/conversations/[id]/stream">) {
  const { id } = await ctx.params;
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
      const ping = setInterval(() => send(": ping\n\n"), PING_MS);
      cleanup = () => {
        clearInterval(ping);
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
