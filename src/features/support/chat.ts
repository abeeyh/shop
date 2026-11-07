import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, count, eq, gt, inArray, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { supportConversations, supportMessages } from "@/db/schema";
import { env } from "@/lib/env";
import { publish } from "@/lib/pubsub";
import { maskSensitive } from "./mask";
import { statusAfterCustomerMessage, type ConversationStatus } from "./rules";

// __Host-: subdomínio não consegue gravar/fixar o cookie (exige secure, path=/ e sem domain)
export const CHAT_COOKIE = env.NODE_ENV === "production" ? "__Host-chat" : "chat";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
export const channelOf = (conversationId: string) => `chat:${conversationId}`;

export type ChatMessage = {
  id: number;
  authorType: "customer" | "staff" | "system";
  body: string;
  createdAt: string;
};

const toMessage = (m: typeof supportMessages.$inferSelect): ChatMessage => ({
  id: m.id,
  authorType: m.authorType,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

// Cookie "chat" = "<id da conversa>.<token>"; no banco só o hash do token (docs/04 — Chat)
export async function guestConversationId(): Promise<string | null> {
  const raw = (await cookies()).get(CHAT_COOKIE)?.value;
  const [id, token] = raw?.split(".") ?? [];
  if (!id || !token || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const [c] = await db
    .select({ hash: supportConversations.guestTokenHash })
    .from(supportConversations)
    .where(eq(supportConversations.id, id));
  if (!c) return null;
  const a = Buffer.from(c.hash);
  const b = Buffer.from(hash(token));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export async function setGuestCookie(id: string, token: string) {
  (await cookies()).set(CHAT_COOKIE, `${id}.${token}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const openCountByEmail = async (email: string) =>
  (
    await db
      .select({ n: count() })
      .from(supportConversations)
      .where(and(eq(supportConversations.guestEmail, email), ne(supportConversations.status, "resolvida")))
  )[0]?.n ?? 0;

export async function createConversation(v: {
  email: string;
  name: string | null;
  locale: string;
  body: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const body = maskSensitive(v.body).text; // RN-95: antes de gravar
  const id = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(supportConversations)
      .values({ guestEmail: v.email, guestName: v.name, locale: v.locale, guestTokenHash: hash(token) })
      .returning({ id: supportConversations.id });
    await tx.insert(supportMessages).values({ conversationId: c!.id, authorType: "customer", body });
    return c!.id;
  });
  await publish("chat:queue", id);
  return { id, token };
}

export async function getConversation(id: string) {
  const [c] = await db.select().from(supportConversations).where(eq(supportConversations.id, id));
  return c ?? null;
}

// grava ANTES de avisar: se o SSE cair, a retomada busca pelo id (docs/04 — Chat)
export async function addMessage(
  conversationId: string,
  author: { type: "customer" | "staff"; id?: string },
  text: string,
  nextStatus?: ConversationStatus,
): Promise<ChatMessage> {
  const body = maskSensitive(text).text; // RN-95 vale para a equipe também
  const msg = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(supportMessages)
      .values({ conversationId, authorType: author.type, authorId: author.id ?? null, body })
      .returning();
    const [c] = await tx
      .select({ status: supportConversations.status })
      .from(supportConversations)
      .where(eq(supportConversations.id, conversationId))
      .for("update");
    const status =
      nextStatus ?? (author.type === "customer" ? statusAfterCustomerMessage(c!.status) : c!.status);
    await tx
      .update(supportConversations)
      .set({ lastMessageAt: new Date(), status, ...(status !== "resolvida" ? { resolvedAt: null } : {}) })
      .where(eq(supportConversations.id, conversationId));
    return m!;
  });
  const out = toMessage(msg);
  await publish(channelOf(conversationId), JSON.stringify(out));
  return out;
}

export async function messagesAfter(conversationId: string, afterId: number): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(supportMessages)
    .where(and(eq(supportMessages.conversationId, conversationId), gt(supportMessages.id, afterId)))
    .orderBy(asc(supportMessages.id))
    .limit(200);
  return rows.map(toMessage);
}

// RN-93: assumir (aberta → em_atendimento, com responsável) e resolver
export async function setConversationStatus(id: string, status: ConversationStatus, staffId: string) {
  const [r] = await db
    .update(supportConversations)
    .set({
      status,
      ...(status === "em_atendimento" ? { assignedTo: staffId } : {}),
      resolvedAt: status === "resolvida" ? new Date() : null,
    })
    .where(eq(supportConversations.id, id))
    .returning({ id: supportConversations.id });
  if (r) await publish(channelOf(id), JSON.stringify({ status }));
  return !!r;
}

export const listQueue = () =>
  db
    .select({
      id: supportConversations.id,
      locale: supportConversations.locale,
      status: supportConversations.status,
      guestName: supportConversations.guestName,
      createdAt: supportConversations.createdAt,
      lastMessageAt: supportConversations.lastMessageAt,
      assignedTo: supportConversations.assignedTo,
    })
    .from(supportConversations)
    .where(inArray(supportConversations.status, ["aberta", "em_atendimento"]))
    .orderBy(asc(supportConversations.createdAt)) // as mais antigas nunca somem da fila
    .limit(200);
