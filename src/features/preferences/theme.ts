import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

// RN-111 (#132): sem httpOnly de propósito — o script do <head> lê o tema antes da pintura (não é dado
// sensível; valor fora da lista é ignorado)
export async function setThemeCookie(theme: Theme) {
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  });
}

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

export async function saveUserTheme(userId: string, theme: Theme) {
  await db.update(users).set({ theme }).where(eq(users.id, userId));
}

// ao entrar/cadastrar: o tema da conta vence; conta sem tema herda o que a pessoa já usava aqui
export async function syncThemeOnLogin(userId: string) {
  const [row] = await db.select({ theme: users.theme }).from(users).where(eq(users.id, userId));
  if (isTheme(row?.theme)) return setThemeCookie(row.theme);
  const current = (await cookies()).get(THEME_COOKIE)?.value;
  if (isTheme(current)) await saveUserTheme(userId, current);
}
