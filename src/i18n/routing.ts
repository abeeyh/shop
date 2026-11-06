import { defineRouting } from "next-intl/routing";

// RN-80: idiomas suportados; RN-81: inglês é o padrão
export const routing = defineRouting({
  locales: ["en", "fr", "de", "pt-BR", "zh-Hant", "zh-Hans"],
  defaultLocale: "en",
  localePrefix: {
    mode: "always",
    prefixes: {
      "pt-BR": "/pt-br",
      "zh-Hant": "/zh-hant",
      "zh-Hans": "/zh-hans",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
