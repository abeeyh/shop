import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "ipn-secret-for-unit-tests";
const load = async (secret = SECRET) => {
  vi.resetModules();
  vi.stubEnv("NOWPAYMENTS_IPN_SECRET", secret);
  return import("./crypto");
};

describe("assinatura do IPN (RN-32)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const body = { payment_status: "finished", order_id: "x", nested: { b: 1, a: 2 }, actually_paid: 10 };

  it("assinatura não depende da ordem das chaves", async () => {
    const { signIpn, verifyIpn } = await load();
    const reordered = {
      actually_paid: 10,
      nested: { a: 2, b: 1 },
      order_id: "x",
      payment_status: "finished",
    };
    expect(signIpn(body, SECRET)).toBe(signIpn(reordered, SECRET));
    expect(verifyIpn(reordered, signIpn(body, SECRET))).toBe(true);
  });

  it("corpo alterado, assinatura ausente ou de outro segredo é recusado", async () => {
    const { signIpn, verifyIpn } = await load();
    const sig = signIpn(body, SECRET);
    expect(verifyIpn({ ...body, actually_paid: 1000 }, sig)).toBe(false);
    expect(verifyIpn(body, null)).toBe(false);
    expect(verifyIpn(body, "abc")).toBe(false);
    expect(verifyIpn(body, signIpn(body, "outro-segredo"))).toBe(false);
  });

  it("#86: sem segredo configurado nada é aceito (sem segredo de desenvolvimento)", async () => {
    const { ipnReady, signIpn, verifyIpn } = await load("");
    expect(ipnReady()).toBe(false);
    expect(verifyIpn(body, signIpn(body, "dev-ipn-secret-only-for-local-and-tests"))).toBe(false);
  });
});
