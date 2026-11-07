import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";

export const TZ_COOKIE = "tz";

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
