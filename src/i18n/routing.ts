import { defineRouting } from "next-intl/routing";

// RN-80: idiomas suportados; RN-81: inglês é o padrão.
// Códigos internos iguais aos da URL (minúsculos): com prefixos diferentes do código, o next-intl
// reescreve /pt-br → /pt-BR e o Next 16 passa a URL reescrita pelo proxy de novo → laço (issue #59).
export const routing = defineRouting({
  locales: ["en", "fr", "de", "pt-br", "zh-hant", "zh-hans"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

// Código BCP 47 canônico para <html lang> e Intl: "pt-br" → "pt-BR", "zh-hant" → "zh-Hant".
export function canonicalLocale(locale: string): string {
  return Intl.getCanonicalLocales(locale)[0] ?? locale;
}
