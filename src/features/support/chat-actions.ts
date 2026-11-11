"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/features/account/session";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { publish } from "@/lib/pubsub";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { currentConversationId } from "./access";
import {
  addMessage,
  createConversation,
  getConversation,
  channelOf,
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

// #162: logado, vale o e-mail da conta; visitante, o digitado
const chatEmail = (customer: { email: string } | null, typed: string | undefined) =>
  (customer ? customer.email : typed)?.toLowerCase() ?? null;

// RN-92/RN-97: visitante abre conversa com e-mail; até 3 abertas por e-mail e limite por IP.
// #162: logado, vale o e-mail da conta (o digitado é ignorado) e a conversa fica na conta.
// shortcut: CAPTCHA entra com a decisão do Turnstile (#29)
export async function startChat(_prev: ChatState, form: FormData): Promise<ChatState> {
  const input = z
    .object({
      locale: z.enum(routing.locales),
      email: z.email().max(254).optional(),
      name: z.string().trim().max(60),
      body,
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error" };
  const customer = await getCustomer();
  const email = chatEmail(customer, input.data.email);
  if (!email) return { status: "error" };
  if (await ipLimited("chatStart")) return { status: "limited" };
  if ((await openCountByEmail(email)) >= MAX_OPEN_PER_EMAIL) return { status: "limited" };
  const { id, token } = await createConversation({
    email,
    name: input.data.name || null,
    locale: input.data.locale,
    body: input.data.body,
    userId: customer ? customer.id : null,
  });
  await setGuestCookie(id, token);
  logger.info({ event: "chat.started", conversationId: id }, "conversa aberta"); // sem e-mail (docs/16)
  return { status: "ok", id };
}

// RN-97: 20 mensagens por minuto por conversa
// chave separada por lado: cliente mandando muito não impede o atendente de responder
async function conversationLimited(id: string, side: "customer" | "staff") {
  return !(await rateLimit({ key: `chatMsg:${id}:${side}`, ...RATE_LIMITS.chatMessage, failClosed: true }))
    .allowed;
}

export async function sendChatMessage(_prev: ChatState, form: FormData): Promise<ChatState> {
  const text = body.safeParse(form.get("body"));
  const id = await currentConversationId(); // #162: a da conta (logado) ou a do cookie
  if (!text.success || !id) return { status: "error" };
  const c = await getConversation(id);
  if (!c || !customerCanReply(c)) return { status: "closed" }; // RN-93: depois de 7 dias, nova conversa
  if (await conversationLimited(id, "customer")) return { status: "limited" };
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
  if (await conversationLimited(c.id, "staff")) return { status: "limited" };
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

// #168: "cliente digitando" — só o lado do cliente avisa e só a equipe mostra (a equipe nunca avisa, então o
// cliente não vê "digitando" do suporte). Vai só o sinal, nunca o texto. Limite por conversa; Valkey fora = ignora.
export async function customerTyping(): Promise<void> {
  const id = await currentConversationId();
  if (!id) return;
  const r = await rateLimit({ key: `chatTyping:${id}`, ...RATE_LIMITS.chatTyping });
  if (r.allowed) await publish(channelOf(id), JSON.stringify({ typing: "customer" }));
}
