"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  addMessage,
  createConversation,
  getConversation,
  guestConversationId,
  openCountByEmail,
  setConversationStatus,
  setGuestCookie,
} from "./chat";
import { customerCanReply, MAX_MESSAGE_LENGTH, MAX_OPEN_PER_EMAIL } from "./rules";

export type ChatState = { status: "idle" | "ok" | "error" | "limited" | "closed"; id?: string };

const body = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH);

async function ipLimited(scope: "chatStart") {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  return !(await rateLimit({ key: `${scope}:${rateLimitKey(ip)}`, ...RATE_LIMITS[scope], failClosed: true }))
    .allowed;
}

// RN-92/RN-97: visitante abre conversa com e-mail; até 3 abertas por e-mail e limite por IP.
// shortcut: CAPTCHA entra com a decisão do Turnstile (#29)
export async function startChat(_prev: ChatState, form: FormData): Promise<ChatState> {
  const input = z
    .object({
      locale: z.enum(routing.locales),
      email: z.email().max(254),
      name: z.string().trim().max(60),
      body,
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error" };
  if (await ipLimited("chatStart")) return { status: "limited" };
  const email = input.data.email.toLowerCase();
  if ((await openCountByEmail(email)) >= MAX_OPEN_PER_EMAIL) return { status: "limited" };
  const { id, token } = await createConversation({
    email,
    name: input.data.name || null,
    locale: input.data.locale,
    body: input.data.body,
  });
  await setGuestCookie(id, token);
  logger.info({ event: "chat.started", conversationId: id }, "conversa aberta"); // sem e-mail (docs/16)
  return { status: "ok", id };
}

// RN-97: 20 mensagens por minuto por conversa
async function conversationLimited(id: string) {
  return !(await rateLimit({ key: `chatMsg:${id}`, ...RATE_LIMITS.chatMessage, failClosed: true })).allowed;
}

export async function sendChatMessage(_prev: ChatState, form: FormData): Promise<ChatState> {
  const text = body.safeParse(form.get("body"));
  const id = await guestConversationId();
  if (!text.success || !id) return { status: "error" };
  const c = await getConversation(id);
  if (!c || !customerCanReply(c)) return { status: "closed" }; // RN-93: depois de 7 dias, nova conversa
  if (await conversationLimited(id)) return { status: "limited" };
  await addMessage(id, { type: "customer" }, text.data);
  return { status: "ok", id };
}

// RN-06/RN-93: equipe responde (aberta vira em atendimento com responsável) e muda o status
export async function staffReply(_prev: ChatState, form: FormData): Promise<ChatState> {
  const input = z
    .object({ locale: z.enum(routing.locales), id: z.uuid(), body })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error" };
  const staff = await requireStaff(input.data.locale, ["admin", "suporte"]);
  const c = await getConversation(input.data.id);
  if (!c) return { status: "error" };
  if (await conversationLimited(c.id)) return { status: "limited" };
  if (c.status === "aberta") await setConversationStatus(c.id, "em_atendimento", staff.user.id);
  await addMessage(c.id, { type: "staff", id: staff.user.id }, input.data.body);
  return { status: "ok", id: c.id };
}

export async function staffSetStatus(form: FormData) {
  const input = z
    .object({
      locale: z.enum(routing.locales),
      id: z.uuid(),
      status: z.enum(["em_atendimento", "resolvida"]),
    })
    .parse(Object.fromEntries(form));
  const staff = await requireStaff(input.locale, ["admin", "suporte"]);
  await setConversationStatus(input.id, input.status, staff.user.id);
  refresh();
}
