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
    expect(env.CLIENT_IP_HEADER).toBe("x-forwarded-for");
  });

  it("valor inválido continua sendo recusado", async () => {
    vi.stubEnv("LOG_LEVEL", "verbose");
    await expect(import("./env")).rejects.toThrow();
  });
});
