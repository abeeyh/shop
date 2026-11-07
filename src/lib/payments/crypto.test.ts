import { describe, expect, it } from "vitest";
import { signIpn, verifyIpn } from "./crypto";

describe("assinatura do IPN (RN-32)", () => {
  const body = { payment_status: "finished", order_id: "x", nested: { b: 1, a: 2 }, actually_paid: 10 };

  it("assinatura não depende da ordem das chaves", () => {
    const reordered = {
      actually_paid: 10,
      nested: { a: 2, b: 1 },
      order_id: "x",
      payment_status: "finished",
    };
    expect(signIpn(body)).toBe(signIpn(reordered));
    expect(verifyIpn(reordered, signIpn(body))).toBe(true);
  });

  it("corpo alterado, assinatura ausente ou de outro segredo é recusado", () => {
    const sig = signIpn(body);
    expect(verifyIpn({ ...body, actually_paid: 1000 }, sig)).toBe(false);
    expect(verifyIpn(body, null)).toBe(false);
    expect(verifyIpn(body, "abc")).toBe(false);
    expect(verifyIpn(body, signIpn(body, "outro-segredo"))).toBe(false);
  });
});
