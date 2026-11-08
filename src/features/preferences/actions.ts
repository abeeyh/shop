"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { TZ_COOKIE } from "@/lib/preferences";
import { isTheme } from "@/lib/theme";
import { getCustomer } from "@/features/account/session";
import { saveUserTheme, setThemeCookie } from "./theme";
import { isTimezone } from "./rules";

const ONE_YEAR = 60 * 60 * 24 * 365;
const schema = z.object({
  timezone: z.string().refine(isTimezone).optional(),
  // detecção automática (1ª visita): nunca sobrescreve o fuso já salvo — a escolha manual vence
  auto: z.boolean().optional(),
});

// RN-82: grava o fuso validado (entrada não confiável — docs/09 caso 11)
export async function savePreferences(input: unknown): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { timezone, auto } = parsed.data;
  const jar = await cookies();
  const opts = {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };
  // a escolha manual chegou antes (cookie inválido não conta — docs/09 caso 11)
  if (auto && isTimezone(jar.get(TZ_COOKIE)?.value)) return { ok: true };
  if (timezone) jar.set(TZ_COOKIE, timezone, opts);
  return { ok: true };
}

// RN-111 (#132): tema validado no cookie; cliente logado também no perfil (volta ao entrar de novo)
export async function saveTheme(theme: unknown): Promise<{ ok: boolean }> {
  if (!isTheme(theme)) return { ok: false };
  await setThemeCookie(theme);
  const customer = await getCustomer();
  if (customer) await saveUserTheme(customer.id, theme);
  return { ok: true };
}
