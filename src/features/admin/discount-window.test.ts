import { describe, expect, it } from "vitest";
import { discountState } from "./discount-window";

// RN-22: vale dentro de [início, fim) — no início já vale; no fim já não vale
describe("estado da promoção/cupom", () => {
  const startsAt = new Date("2026-11-10T00:00:00Z");
  const endsAt = new Date("2026-11-11T00:00:00Z");
  const d = { active: true, startsAt, endsAt };
  it("agendada, vigente e expirada pela janela", () => {
    expect(discountState(d, new Date("2026-11-09T23:59:59Z"))).toBe("scheduled");
    expect(discountState(d, startsAt)).toBe("live");
    expect(discountState(d, new Date(endsAt.getTime() - 1))).toBe("live");
    expect(discountState(d, endsAt)).toBe("expired");
  });
  it("desativada vence a janela", () => {
    expect(discountState({ ...d, active: false }, startsAt)).toBe("inactive");
  });
});
