"use client";

import { useEffect } from "react";
import { DEFAULT_THEME } from "@/lib/theme";

// #132: o script do <head> só roda no carregamento; depois de entrar (navegação sem recarregar) o tema
// da conta chega pelo servidor e é aplicado aqui
export function ThemeSync({ theme }: { theme: string }) {
  useEffect(() => {
    if (theme === DEFAULT_THEME) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
