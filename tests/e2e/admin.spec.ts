import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

// #20: admin com 2FA e CRUD de categorias/produtos. RN-02, RN-04, RN-13, RN-19, RN-70, RN-72, RN-73.

// TOTP (RFC 6238, SHA-1, 30 s, 6 dígitos) a partir da chave base32 mostrada na ativação
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function login(page: Page, password = E2E_ADMIN.password) {
  await page.goto("/en/admin/entrar");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("admin", () => {
  test.skip(({ isMobile }) => isMobile, "uma conta de admin por rodada; o fluxo é de servidor");

  test("RN-02: sem sessão o painel manda para o login; senha errada é recusada", async ({ page }) => {
    await page.goto("/en/admin/categorias");
    await expect(page).toHaveURL(/\/en\/admin\/entrar$/);
    await login(page, "senha-errada-123");
    await expect(page.getByText("Invalid email, password or code.")).toBeVisible();
  });

  test("RN-02/RN-19: ativa 2FA, cria categoria e produto que aparecem na vitrine", async ({
    page,
    browser,
    baseURL,
  }) => {
    // outro aparelho entra só com a senha antes da ativação
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await login(otherPage);
    await expect(otherPage).toHaveURL(/\/en\/admin\/2fa$/);

    await login(page);
    await expect(page).toHaveURL(/\/en\/admin\/2fa$/); // painel bloqueado até ativar o 2FA
    await page.goto("/en/admin/categorias");
    await expect(page).toHaveURL(/\/en\/admin\/2fa$/);
    await page.getByLabel("Password").fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Get setup key" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
    await page.getByLabel("Code from the app").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on and continue" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);

    // RN-02: a sessão sem código do outro aparelho foi revogada na ativação
    await otherPage.goto("/en/admin/categorias");
    await expect(otherPage).toHaveURL(/\/en\/admin\/entrar$/);
    await other.close();

    const id = Date.now().toString(36);
    await page.goto("/en/admin/categorias");
    await page.getByLabel("Name").fill(`E2E Raids ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-raids-${id}`);
    await page.getByLabel("Type").selectOption("raid");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await expect(page.getByRole("cell", { name: new RegExp(`E2E Raids ${id}`) }).first()).toBeVisible();

    await page.goto("/en/admin/produtos");
    await page.getByLabel("Category").selectOption({ label: `E2E Raids ${id}` });
    await page.getByLabel("Name").fill(`E2E Raid Product ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-product-${id}`);
    await page.getByLabel("Price (USDT)").fill("9.99");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    // slug repetido é recusado no campo (o formulário de criação limpa depois de salvar)
    await page.getByLabel("Name").fill(`E2E Raid Product ${id} 2`);
    await page.getByLabel("Slug (URL)").fill(`e2e-product-${id}`);
    await page.getByLabel("Price (USDT)").fill("1");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/^Slug: lowercase/)).toBeVisible();

    await page.goto(`/en/wow/e2e-raids-${id}/e2e-product-${id}`);
    await expect(page.getByRole("heading", { name: `E2E Raid Product ${id}` })).toBeVisible();
    await expect(page.getByText("9.99").first()).toBeVisible();

    // RN-73: categoria com produto ativo não pode ser desativada
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: `Edit E2E Raids ${id}` }).click();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Deactivate or move the active products/)).toBeVisible();

    // tira o produto e a categoria do teste da vitrine (RN-72: desativa, não apaga)
    await page.goto("/en/admin/produtos");
    await page.getByRole("link", { name: `Edit E2E Raid Product ${id}` }).click();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: `Edit E2E Raids ${id}` }).click();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    // RN-02: depois de sair, o login pede o código
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/entrar$/);
    await login(page);
    await expect(page).toHaveURL(/\/en\/admin\/entrar\/codigo$/);
    await page.getByLabel("Code").fill(totp(secret, Date.now() + 30_000)); // janela seguinte: não reusa
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
  });
});
