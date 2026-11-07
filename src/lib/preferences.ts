import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";

export const REGIONS = ["US", "EU"] as const;
export type GameRegion = (typeof REGIONS)[number];
export const REGION_COOKIE = "region";
export const TZ_COOKIE = "tz";

// RN-14: região escolhida pelo visitante; cookie inválido → padrão (docs/09 caso 11)
export async function getRegion(): Promise<GameRegion> {
  const value = (await cookies()).get(REGION_COOKIE)?.value;
  return REGIONS.find((r) => r === value) ?? "US";
}

// RN-82: fuso salvo (detectado ou escolhido); null = ainda não detectado. Validado antes de usar.
export async function getTimezone(): Promise<string | null> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  if (!value || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}
