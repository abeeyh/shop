import { messagesAfter } from "@/features/support/chat";
import { canAccessConversation } from "@/features/support/access";

// Retomada do chat: mensagens depois do último id que o cliente tem (docs/04 — Chat)
export async function GET(request: Request, ctx: RouteContext<"/api/support/conversations/[id]/messages">) {
  const { id } = await ctx.params;
  if (!(await canAccessConversation(id))) return new Response(null, { status: 404 });
  const after = Math.max(0, Number(new URL(request.url).searchParams.get("after")) || 0);
  return Response.json(await messagesAfter(id, after), { headers: { "Cache-Control": "no-store" } });
}
