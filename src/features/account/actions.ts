"use server";

import { APIError } from "better-auth/api";
import { verifyPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { isPwnedPassword } from "@/features/staff/hibp";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { AVATARS } from "./avatars";
import {
  addCharacter,
  deleteCharacter,
  deleteCustomer,
  isStaff,
  saveProfile,
  staffPasswordHash,
} from "./queries";
import { characterInput, signInInput, signUpInput } from "./schemas";
import { safeNext } from "./next";
import { syncThemeOnLogin } from "@/features/preferences/theme";
import { getCustomer } from "./session";

export type AccountState = {
  error: "" | "invalid" | "limited" | "pwned" | "limit" | "duplicate" | "exists" | "staff";
};

const locale = z.enum(routing.locales);

// docs/09 §2: por IP (e por e-mail no login); Valkey fora = bloqueia
async function limited(scope: "signup" | "login", key?: string): Promise<boolean> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  // login usa o mesmo balde por IP da equipe (features/auth/actions.ts: `login:<ip>`)
  const ipKey = scope === "login" ? `login:${rateLimitKey(ip)}` : `customer-signup:${rateLimitKey(ip)}`;
  const keys = [ipKey, ...(key ? [`login:${key}`] : [])];
  for (const key of keys) {
    const r = await rateLimit({ key, ...RATE_LIMITS[scope], failClosed: true });
    if (!r.allowed) return true;
  }
  return false;
}

// RN-107 (#118): cadastro opcional que já entra logado. E-mail já usado recebe "já tem conta — entre"
// (decisão do dono; risco aceito no doc 09: dá para saber se um e-mail tem conta). 5/h por IP.
export async function signUp(_prev: AccountState, form: FormData): Promise<AccountState> {
  const input = signUpInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { email, password, locale: l } = input.data;
  if (await limited("signup")) return { error: "limited" };
  if (await isPwnedPassword(password)) return { error: "pwned" };
  try {
    const { user } = await auth.api.signUpEmail({
      body: { email, password, name: "" },
      headers: await headers(),
    });
    await syncThemeOnLogin(user.id); // #132: o tema em uso vai para a conta nova
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
    return { error: "exists" };
  }
  logger.info(
    { event: "account.created", requestId: getRequestId(await headers()) },
    "conta de cliente criada",
  );
  redirect(safeNext(form.get("next"), l) ?? `/${l}/conta`); // #130: volta para onde estava
}

// RN-110: conta da equipe não entra pela loja — com a senha certa, avisa para usar o /admin; com a
// senha errada, a mesma resposta de sempre (quem não sabe a senha não descobre quem é da equipe)
async function staffLogin(email: string, password: string): Promise<AccountState | null> {
  const hash = await staffPasswordHash(email);
  if (!hash) return null;
  return { error: (await verifyPassword({ hash, password })) ? "staff" : "invalid" };
}

export async function signInCustomer(_prev: AccountState, form: FormData): Promise<AccountState> {
  const input = signInInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { email, password, locale: l } = input.data;
  if (await limited("login", `email:${email.toLowerCase()}`)) return { error: "limited" };
  const staff = await staffLogin(email, password);
  if (staff) return staff;
  try {
    const { user } = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    await syncThemeOnLogin(user.id); // #132: entra com o tema salvo na conta
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
    const requestId = getRequestId(await headers()); // docs/16: requestId em todo log; sem e-mail
    logger.warn({ event: "auth.customer_login_failed", requestId }, "login de cliente recusado");
    return { error: "invalid" };
  }
  redirect(safeNext(form.get("next"), l) ?? `/${l}/conta`); // #130: volta para onde estava
}

export async function signOut(form: FormData): Promise<void> {
  const l = locale.catch("en").parse(form.get("locale"));
  await auth.api.signOut({ headers: await headers() });
  // #130: sair pelo cabeçalho fica na mesma página (área da conta volta para a home)
  const next = safeNext(form.get("next"), l);
  redirect(next && !next.startsWith(`/${l}/conta`) ? next : `/${l}`);
}

// #162: nome e avatar pronto do perfil (só da própria conta; avatar só da lista)
const profileInput = z.object({
  name: z.string().trim().max(40),
  avatar: z.union([z.literal(""), z.enum(AVATARS)]).transform((v) => v || null),
});

export type ProfileState = { status: "idle" | "ok" | "error" };

export async function updateProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const customer = await getCustomer();
  const input = profileInput.safeParse(Object.fromEntries(form));
  if (!customer || !input.success) return { status: "error" };
  await saveProfile(customer.id, input.data);
  refresh(); // cabeçalho e perfil mostram o avatar novo
  return { status: "ok" };
}

// RN-108: personagem salvo (até 10; repetido não duplica)
export async function saveCharacter(_prev: AccountState, form: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  const input = characterInput.safeParse(Object.fromEntries(form));
  if (!customer || !input.success) return { error: "invalid" };
  const r = await addCharacter(customer.id, input.data);
  refresh();
  return { error: r === "ok" ? "" : r };
}

export async function removeCharacter(form: FormData): Promise<void> {
  const customer = await getCustomer();
  const id = z.uuid().safeParse(form.get("id"));
  if (customer && id.success) await deleteCharacter(customer.id, id.data);
  refresh();
}

// RN-109: excluir a conta pede a senha de novo. Conta de equipe não se exclui por aqui (RN-04/RN-72).
export async function deleteAccount(_prev: AccountState, form: FormData): Promise<AccountState> {
  const input = z
    .object({ password: z.string().min(1).max(200), locale })
    .safeParse(Object.fromEntries(form));
  const customer = await getCustomer();
  if (!input.success || !customer || (await isStaff(customer.id))) return { error: "invalid" };
  // por conta também: sessão roubada trocando de IP não testa a senha à vontade
  if (await limited("login", `user:${customer.id}`)) return { error: "limited" };
  const h = await headers();
  try {
    await auth.api.verifyPassword({ body: { password: input.data.password }, headers: h });
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
    return { error: "invalid" };
  }
  await auth.api.signOut({ headers: h });
  await deleteCustomer(customer.id);
  logger.info({ event: "account.deleted", requestId: getRequestId(h) }, "conta de cliente excluída");
  redirect(`/${input.data.locale}`);
}
