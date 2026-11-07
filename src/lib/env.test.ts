import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("variável vazia (como no .env.example) conta como não definida", async () => {
    vi.stubEnv("LOG_LEVEL", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("CLIENT_IP_HEADER", "");
    const { env } = await import("./env");
    expect(env.LOG_LEVEL).toBeUndefined();
    expect(env.CRON_SECRET).toBeUndefined();
    expect(env.CLIENT_IP_HEADER).toBeUndefined();
  });

  it("valor inválido continua sendo recusado", async () => {
    vi.stubEnv("LOG_LEVEL", "verbose");
    await expect(import("./env")).rejects.toThrow();
  });

  it("production sem CLIENT_IP_HEADER não sobe (IP forjável — docs/16 §9)", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "");
    await expect(import("./env")).rejects.toThrow(/CLIENT_IP_HEADER/);
  });

  const productionPayments = () => {
    vi.stubEnv("PAYMENTS_PROVIDER", "nowpayments");
    vi.stubEnv("NOWPAYMENTS_API_KEY", "key");
    vi.stubEnv("NOWPAYMENTS_IPN_SECRET", "ipn-secret-16-chars");
    vi.stubEnv("NOWPAYMENTS_SANDBOX", "false");
    vi.stubEnv("ORDER_LINK_SECRET", "x".repeat(32));
  };

  it("production com header da CDN sobe", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    vi.stubEnv("VALKEY_URL", "redis://cache:6379");
    productionPayments();
    const { env } = await import("./env");
    expect(env.CLIENT_IP_HEADER).toBe("cf-connecting-ip");
  });

  it("RN-32: production com pagamento fake ou sandbox não sobe", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    vi.stubEnv("VALKEY_URL", "redis://cache:6379");
    productionPayments();
    vi.stubEnv("PAYMENTS_PROVIDER", "fake");
    await expect(import("./env")).rejects.toThrow(/PAYMENTS_PROVIDER/);
    vi.resetModules();
    productionPayments();
    vi.stubEnv("NOWPAYMENTS_SANDBOX", "true");
    await expect(import("./env")).rejects.toThrow(/PAYMENTS_PROVIDER/);
  });

  it("RN-32: build de produção sem APP_ENV não sobe (nunca cai no pagamento fake)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "");
    await expect(import("./env")).rejects.toThrow(/APP_ENV/);
  });

  it("RN-32: homologação com pagamento fake não sobe (segredo de dev é público)", async () => {
    vi.stubEnv("APP_ENV", "homologacao");
    vi.stubEnv("PAYMENTS_PROVIDER", "fake");
    await expect(import("./env")).rejects.toThrow(/PAYMENTS_PROVIDER/);
  });

  it("production sem VALKEY_URL não sobe (rate limit é controle de segurança)", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    vi.stubEnv("VALKEY_URL", "");
    await expect(import("./env")).rejects.toThrow(/VALKEY_URL/);
  });
});
