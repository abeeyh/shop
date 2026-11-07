import { expect, test } from "@playwright/test";

// RN-80/RN-81: 6 idiomas, detecção pelo idioma do navegador, inglês como padrão.
// Usa a `locale` do contexto: o Chrome monta o Accept-Language a partir dela (header manual é ignorado).
const LOCALES = [
  { accept: "en-US", path: "/en", lang: "en", title: "Your WoW progress, without the grind" },
  { accept: "fr-FR", path: "/fr", lang: "fr", title: "Progressez dans WoW, sans le farm" },
  { accept: "de-DE", path: "/de", lang: "de", title: "Dein WoW-Fortschritt, ohne Grind" },
  { accept: "pt-BR", path: "/pt-br", lang: "pt-BR", title: "Seu progresso no WoW, sem o grind" },
  { accept: "zh-TW", path: "/zh-hant", lang: "zh-Hant", title: "輕鬆推進你的 WoW 進度" },
  { accept: "zh-CN", path: "/zh-hans", lang: "zh-Hans", title: "轻松推进你的 WoW 进度" },
];

for (const l of LOCALES) {
  test(`RN-81: navegador em ${l.accept} → ${l.path} com o texto no idioma`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: l.accept, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${l.path}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", l.lang);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(l.title);
    await context.close();
  });
}

test("RN-81: idioma fora dos 6 cai no inglês", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ locale: "ja-JP", baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await context.close();
});

test("idioma inválido na URL → 404", async ({ request }) => {
  const res = await request.get("/xx/coisa");
  expect(res.status()).toBe(404);
});

test("docs/11 §7: sem rolagem horizontal na tela", async ({ page }) => {
  await page.goto("/pt-br");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("docs/16 §3: toda resposta traz x-request-id", async ({ request }) => {
  const res = await request.get("/en");
  expect(res.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
});

test("/api/health responde ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
