import { describe, expect, it } from "vitest";
import { clientIp, rateLimitKey } from "./client-ip";

describe("client-ip", () => {
  it("lê o primeiro IP válido do header configurado", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.5" }), "cf-connecting-ip")).toBe(
      "203.0.113.5",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4:80" }), "x-forwarded-for")).toBeNull();
  });

  it("IPv4: chave por endereço", () => {
    expect(rateLimitKey("203.0.113.5")).toBe("ip:203.0.113.5");
  });

  it("IPv6: todos os endereços do mesmo /64 caem na mesma chave", () => {
    const a = rateLimitKey("2001:db8:abcd:12::1");
    expect(a).toBe("ip6:2001:db8:abcd:12::/64");
    expect(rateLimitKey("2001:0db8:abcd:0012:ffff:1:2:3")).toBe(a);
    expect(rateLimitKey("2001:db8:abcd:12:dead:beef::")).toBe(a);
    expect(rateLimitKey("2001:db8:abcd:13::1")).not.toBe(a); // outro /64
  });

  it("IPv6 abreviado no começo e no meio", () => {
    expect(rateLimitKey("::1")).toBe("ip6:0:0:0:0::/64");
    expect(rateLimitKey("2001:db8::1")).toBe("ip6:2001:db8:0:0::/64");
  });

  it("sem IP válido → balde único (fail-safe)", () => {
    expect(rateLimitKey(null)).toBe("ip:unknown");
  });
});
