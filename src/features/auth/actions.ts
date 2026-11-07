"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { auth } from "./auth";
import { getStaff } from "./staff";

export type AuthState = { error: "" | "invalid" | "limited"; totpUri?: string; backupCodes?: string[] };

const locale = z.enum(routing.locales);
const code = z.string().regex(/^\d{6}$/);

// docs/09 §2: tentativa de senha/código limitada por IP (e por e-mail no login); Valkey fora = bloqueia
async function limited(scope: string, extra?: string): Promise<boolean> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const keys = [`${scope}:${rateLimitKey(ip)}`, ...(extra ? [`${scope}:email:${extra}`] : [])];
  for (const key of keys) {
    const r = await rateLimit({ key, ...RATE_LIMITS.login, failClosed: true });
    if (!r.allowed) return true;
  }
  return false;
}

const isAuthError = (err: unknown) => err instanceof APIError;

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(200), locale })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { email, password, locale: l } = input.data;
  if (await limited("login", email.toLowerCase())) return { error: "limited" };
  let twoFactor = false;
  try {
    const r = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    twoFactor = "twoFactorRedirect" in r && r.twoFactorRedirect === true;
  } catch (err) {
    if (!isAuthError(err)) throw err;
    logger.warn({ event: "auth.login_failed" }, "login recusado"); // sem e-mail no log (docs/16)
    return { error: "invalid" };
  }
  redirect(twoFactor ? `/${l}/admin/entrar/codigo` : `/${l}/admin/2fa`);
}

// Login: confirma o código depois da senha. Ativação: confirma o primeiro código do app autenticador.
export async function verifyCode(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = z.object({ code, locale }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  if (await limited("totp")) return { error: "limited" };
  const h = await headers();
  // RN-02: na ativação (há sessão), sessões abertas só com senha em outros aparelhos não podem virar
  // sessões "com 2FA" — revoga antes (o verifyTOTP troca a sessão atual por uma nova)
  if (await auth.api.getSession({ headers: h })) await auth.api.revokeOtherSessions({ headers: h });
  try {
    await auth.api.verifyTOTP({ body: { code: input.data.code }, headers: h });
  } catch (err) {
    if (!isAuthError(err)) throw err;
    return { error: "invalid" };
  }
  redirect(`/${input.data.locale}/admin`);
}

// RN-02: gera o segredo TOTP; só vale depois do primeiro código confirmado (verifyCode)
export async function startTwoFactor(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = z.object({ password: z.string().min(1).max(200) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  if (!(await getStaff())) return { error: "invalid" };
  if (await limited("login")) return { error: "limited" };
  try {
    const r = await auth.api.enableTwoFactor({
      body: { password: input.data.password },
      headers: await headers(),
    });
    if (r.method !== "totp") return { error: "invalid" };
    return { error: "", totpUri: r.totpURI, backupCodes: r.backupCodes };
  } catch (err) {
    if (!isAuthError(err)) throw err;
    return { error: "invalid" };
  }
}

export async function signOut(form: FormData) {
  const l = locale.catch("en").parse(form.get("locale"));
  await auth.api.signOut({ headers: await headers() });
  redirect(`/${l}/admin/entrar`);
}
