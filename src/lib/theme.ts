// #132: temas de cor (docs/11 §2). Os tokens de cada um ficam em globals.css ([data-theme="…"]).
export const THEMES = ["violeta", "brasa", "vil", "gelo", "carmesim", "ouro", "vazio"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "violeta";
export const THEME_COOKIE = "theme";

export const isTheme = (v: unknown): v is Theme => THEMES.includes(v as Theme);

// roda no <head> antes da pintura: aplica o tema do cookie sem piscar (valor fora da lista = padrão)
export const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([a-z]+)/);if(m&&${JSON.stringify(
  THEMES,
)}.indexOf(m[1])>0)document.documentElement.dataset.theme=m[1]}catch(e){}`;
