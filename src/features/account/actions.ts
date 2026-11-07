"use server";

import { APIError } from "better-auth/api";
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
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { addCharacter, deleteCharacter, deleteCustomer, isStaff } from "./queries";
import { characterInput, signInInput, signUpInput } from "./schemas";
import { getCustomer } from "./session";

export type AccountState = { error: "" | "invalid" | "limited" | "pwned" | "limit" | "duplicate" };

const locale = z.enum(routing.locales);

// docs/09 §2: por IP (e por e-mail no login); Valkey fora = bloqueia
async function limited(scope: "signup" | "login", email?: string): Promise<boolean> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const keys = [`customer-${scope}:${rateLimitKey(ip)}`, ...(email ? [`login:email:${email}`] : [])];
  for (const key of keys) {
    const r = await rateLimit({ key, ...RATE_LIMITS[scope], failClosed: true });
    if (!r.allowed) return true;
  }
  return false;
}

// RN-107: cadastro opcional. docs/09 "Nunca": não revelar se o e-mail já existe — conta nova ou e-mail
// já usado dão a MESMA resposta (ninguém entra sozinho; o próximo passo é sempre o login)
export async function signUp(_prev: AccountState, form: FormData): Promise<AccountState> {
  const input = signUpInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { email, password, locale: l } = input.data;
  if (await limited("signup")) return { error: "limited" };
  if (await isPwnedPassword(password)) return { error: "pwned" };
  try {
    await auth.api.signUpEmail({ body: { email, password, name: "" }, headers: await headers() });
    logger.info({ event: "account.created" }, "conta de cliente criada"); // sem e-mail no log (docs/16)
  } catch (err) {
    if (!(err instanceof APIError)) throw err; // e-mail já usado: segue igual
  }
  redirect(`/${l}/entrar?novo=1`);
}

export async function signInCustomer(_prev: AccountState, form: FormData): Promise<AccountState> {
  const input = signInInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { email, password, locale: l } = input.data;
  if (await limited("login", email.toLowerCase())) return { error: "limited" };
  let twoFactor = false;
  try {
    const r = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    twoFactor = "twoFactorRedirect" in r && r.twoFactorRedirect === true;
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
    logger.warn({ event: "auth.customer_login_failed" }, "login de cliente recusado");
    return { error: "invalid" };
  }
  // conta de equipe com 2FA (RN-02): o código é pedido na tela da equipe
  redirect(twoFactor ? `/${l}/admin/entrar/codigo` : `/${l}/conta`);
}

export async function signOut(form: FormData): Promise<void> {
  const l = locale.catch("en").parse(form.get("locale"));
  await auth.api.signOut({ headers: await headers() });
  redirect(`/${l}`);
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
  if (await limited("login")) return { error: "limited" };
  const h = await headers();
  try {
    await auth.api.verifyPassword({ body: { password: input.data.password }, headers: h });
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
    return { error: "invalid" };
  }
  await auth.api.signOut({ headers: h });
  await deleteCustomer(customer.id);
  logger.info({ event: "account.deleted" }, "conta de cliente excluída");
  redirect(`/${input.data.locale}`);
}
