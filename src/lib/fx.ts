import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-18: estimativa "≈" na moeda local; nunca usada para cobrar (a cobrança é em USDT).
// shortcut: cotações fixas; trocar por API de cotação com cache (cron /api/cron/refresh-fx) antes do lançamento.
const USDT_TO: Record<string, number> = { USD: 1, EUR: 0.92, BRL: 5.35, TWD: 32.1, CNY: 7.15 };
const CURRENCY_BY_LOCALE: Record<string, string> = {
  en: "USD",
  fr: "EUR",
  de: "EUR",
  "pt-br": "BRL",
  "zh-hant": "TWD",
  "zh-hans": "CNY",
};

export function estimate(locale: string, usdtCents: number): { currency: string; amount: number } {
  const currency = CURRENCY_BY_LOCALE[locale] ?? "USD";
  return { currency, amount: (usdtCents / 100) * (USDT_TO[currency] ?? 1) };
}
