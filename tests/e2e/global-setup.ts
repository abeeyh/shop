import { execFileSync } from "node:child_process";
import Valkey from "iovalkey";
import postgres from "postgres";

export const E2E_ADMIN = { email: "e2e-admin@shop.test", password: "e2e-admin-password-123" };

// Recria o admin do E2E sem 2FA (o teste ativa). --reset só roda em APP_ENV=local.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const isLocal = (url: string | undefined) => !!url && LOCAL_HOSTS.has(new URL(url).hostname);

export default async function globalSetup() {
  // apaga dados e cria conta com senha pública: só em banco/Valkey locais (local ou serviço do CI)
  if (process.env.APP_ENV !== "local" || !isLocal(process.env.DATABASE_URL)) {
    throw new Error("E2E só roda com APP_ENV=local e DATABASE_URL em localhost.");
  }
  // dados criados pelo E2E do admin numa rodada anterior saem da vitrine (slugs e2e-*)
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const e2eProducts = sql`select id from products where slug like 'e2e-%'`;
  await sql`delete from coupon_redemptions where coupon_id in (select id from coupons where code like 'e2e%')`;
  await sql`delete from coupons where code like 'e2e%' or product_id in (${e2eProducts})`;
  await sql`delete from promotions where name like 'E2E%' or product_id in (${e2eProducts})`;
  await sql`delete from cart_items where product_id in (${e2eProducts})`;
  // RN-72: com pedido não apaga — só desativa
  await sql`update products set active = false where slug like 'e2e-%'`;
  await sql`delete from products where slug like 'e2e-%' and id not in (select product_id from order_items)`;
  await sql`update categories set active = false where slug like 'e2e-%'`;
  await sql`delete from categories where slug like 'e2e-%' and id not in (select category_id from products)`;
  // contas de suporte criadas por convite no E2E (cascata: sessões, senha, 2FA, perfil)
  await sql`delete from support_conversations where guest_email like 'e2e-%'`;
  await sql`delete from support_hours`; // banco local: começa sem horário (chat sempre aberto)
  await sql`delete from users where email like 'e2e-support-%@shop.test'`;
  await sql.end();
  // tentativas de login das rodadas anteriores (rate limit de login — docs/09 §2)
  const valkeyUrl = process.env.VALKEY_URL;
  if (valkeyUrl && isLocal(valkeyUrl)) {
    const valkey = new Valkey(valkeyUrl);
    const keys = [
      ...(await valkey.keys("rl:login:*")),
      ...(await valkey.keys("rl:totp:*")),
      ...(await valkey.keys("rl:checkout:*")),
      ...(await valkey.keys("rl:coupon:*")),
      ...(await valkey.keys("rl:report:*")),
      ...(await valkey.keys("rl:chatStart:*")),
      ...(await valkey.keys("rl:sse:*")),
    ];
    if (keys.length) await valkey.del(...keys);
    valkey.disconnect();
  }
  execFileSync(process.execPath, ["scripts/create-admin.mjs", E2E_ADMIN.email, "--reset"], {
    env: { ...process.env, ADMIN_PASSWORD: E2E_ADMIN.password, NODE_NO_WARNINGS: "1" },
    stdio: "inherit",
  });
}
