import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Navegação que conhece o idioma: trocar de idioma mantém a página atual (RN-81)
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

export const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  "pt-br": "Português (BR)",
  "zh-hant": "繁體中文",
  "zh-hans": "简体中文",
};
