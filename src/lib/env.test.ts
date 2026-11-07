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

  it("production com header da CDN sobe", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    vi.stubEnv("VALKEY_URL", "redis://cache:6379");
    const { env } = await import("./env");
    expect(env.CLIENT_IP_HEADER).toBe("cf-connecting-ip");
  });

  it("production sem VALKEY_URL não sobe (rate limit é controle de segurança)", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    vi.stubEnv("VALKEY_URL", "");
    await expect(import("./env")).rejects.toThrow(/VALKEY_URL/);
  });
});
