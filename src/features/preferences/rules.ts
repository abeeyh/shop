import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

export const REGIONS = ["US", "EU"] as const;
export type GameRegion = (typeof REGIONS)[number];

export const isRegion = (v: unknown): v is GameRegion => REGIONS.some((r) => r === v);

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

// RN-14: sugestão de região pelo fuso (doc 04): Europa, África e Atlântico → EU; o resto → US
// (padrão da RN-14; Oceania e Sudeste Asiático jogam nos servidores US/Oceanic; UTC desconhecido → US)
export const regionForTimezone = (tz: string): GameRegion =>
  /^(Europe|Africa|Atlantic)\//.test(tz) ? "EU" : "US";

// Lista para o seletor, com o fuso atual garantido mesmo se for um alias fora da lista oficial
export function timezoneOptions(current: string | null): string[] {
  const all = Intl.supportedValuesOf("timeZone");
  return current && !all.includes(current) ? [current, ...all] : all;
}

// Região a gravar: a escolhida; senão, na detecção automática, a sugerida pelo fuso — só se ainda não há uma
export function regionToSave(input: {
  region?: string;
  timezone?: string;
  auto?: boolean;
  hasRegion: boolean;
}): GameRegion | null {
  if (isRegion(input.region)) return input.region;
  if (input.auto && input.timezone && !input.hasRegion) return regionForTimezone(input.timezone);
  return null;
}
