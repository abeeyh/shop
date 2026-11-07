import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-82: fuso IANA válido (docs/09 caso 11 — cookie inválido nunca é usado)
export function isTimezone(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 64 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(v)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

// Lista para o seletor, com o fuso atual garantido mesmo se for um alias fora da lista oficial
export function timezoneOptions(current: string | null): string[] {
  const all = Intl.supportedValuesOf("timeZone");
  return current && !all.includes(current) ? [current, ...all] : all;
}
