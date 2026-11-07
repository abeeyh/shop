import { describe, expect, it } from "vitest";
import { isBookable, seatsLeft } from "./rules";

const now = new Date("2026-11-07T12:00:00Z");
const future = new Date("2026-11-08T01:00:00Z");

describe("agenda de raids", () => {
  it("RN-16: vagas restantes = capacidade − reservadas (nunca negativo)", () => {
    expect(seatsLeft({ capacity: 10, reserved: 3 })).toBe(7);
    expect(seatsLeft({ capacity: 10, reserved: 12 })).toBe(0);
  });

  it("RN-11: horário esgotado ou que já começou não pode ser reservado", () => {
    expect(isBookable({ capacity: 10, reserved: 9, startsAt: future }, now)).toBe(true);
    expect(isBookable({ capacity: 10, reserved: 10, startsAt: future }, now)).toBe(false);
    expect(isBookable({ capacity: 10, reserved: 0, startsAt: new Date("2026-11-07T11:59:00Z") }, now)).toBe(
      false,
    );
  });
});
