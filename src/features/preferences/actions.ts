"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { REGION_COOKIE, TZ_COOKIE } from "@/lib/preferences";
import { isRegion, isTimezone, regionToSave } from "./rules";

const ONE_YEAR = 60 * 60 * 24 * 365;
const schema = z.object({
  region: z.string().refine(isRegion).optional(),
  timezone: z.string().refine(isTimezone).optional(),
  // detecção automática (1ª visita): nunca sobrescreve fuso/região já salvos — a escolha manual vence
  auto: z.boolean().optional(),
});

// RN-14 / RN-82: grava a preferência validada (entrada não confiável — docs/09 caso 11)
export async function savePreferences(input: unknown): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { region, timezone, auto } = parsed.data;
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
  const region_ = regionToSave({ region, timezone, auto, hasRegion: jar.has(REGION_COOKIE) });
  if (region_) jar.set(REGION_COOKIE, region_, opts);
  return { ok: true };
}
