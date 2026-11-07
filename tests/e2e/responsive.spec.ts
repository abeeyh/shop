import { expect, test } from "@playwright/test";

// docs/11 §7 (#90): toda tela de 360 px a 1920 px sem rolagem horizontal
const PAGES = [
  "/en",
  "/pt-br/produtos",
  "/en/wow/gold",
  "/en/wow/raids",
  "/en/wow/mythic-plus/mythic-plus-10",
  "/en/wow/pvp/pvp-2v2-0-1600",
  "/en/carrinho",
  "/en/reportar",
  "/en/admin/entrar",
];

for (const width of [360, 1920]) {
  test(`sem rolagem horizontal em ${width}px`, async ({ page, isMobile }) => {
    test.skip(isMobile !== (width === 360), "celular confere 360 px; desktop confere 1920 px");
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} rola na horizontal em ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}
