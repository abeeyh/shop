import { describe, expect, it } from "vitest";
import { isTheme, THEME_SCRIPT } from "./theme";

// RN-111 (#132): só tema da lista vira data-theme (cookie é entrada não confiável — docs/09)
function run(cookie: string) {
  const document = { cookie, documentElement: { dataset: {} as Record<string, string> } };
  new Function("document", THEME_SCRIPT)(document);
  return document.documentElement.dataset.theme;
}

describe("tema", () => {
  it("aplica tema válido do cookie", () => {
    expect(run("a=1; theme=brasa; b=2")).toBe("brasa");
  });
  it("ignora padrão, valor desconhecido e cookie com outro nome", () => {
    expect(run("theme=violeta")).toBeUndefined();
    expect(run("theme=hack")).toBeUndefined();
    expect(run("xtheme=brasa")).toBeUndefined();
  });
  it("isTheme valida a lista", () => {
    expect(isTheme("gelo")).toBe(true);
    expect(isTheme("<script>")).toBe(false);
  });
});
