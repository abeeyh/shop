import { describe, expect, it } from "vitest";
import { isOpen, nextOpening, toHHMM, toMinutes } from "./hours";

describe("horário de atendimento (RN-99)", () => {
  // segunda a sexta, 12:00–20:00 UTC
  const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 720, endMin: 1200 }));

  it("aberto dentro da janela, fechado fora; sem horário = sempre aberto", () => {
    expect(isOpen(weekdays, new Date("2026-11-09T13:00:00Z"))).toBe(true); // segunda
    expect(isOpen(weekdays, new Date("2026-11-09T20:00:00Z"))).toBe(false); // fim exclusivo
    expect(isOpen(weekdays, new Date("2026-11-08T13:00:00Z"))).toBe(false); // domingo
    expect(isOpen([], new Date("2026-11-08T13:00:00Z"))).toBe(true);
  });

  it("próxima abertura: mesmo dia, dia seguinte e depois do fim de semana", () => {
    expect(nextOpening(weekdays, new Date("2026-11-09T10:15:00Z"))?.toISOString()).toBe(
      "2026-11-09T12:00:00.000Z",
    );
    expect(nextOpening(weekdays, new Date("2026-11-09T21:00:00Z"))?.toISOString()).toBe(
      "2026-11-10T12:00:00.000Z",
    );
    expect(nextOpening(weekdays, new Date("2026-11-14T09:00:00Z"))?.toISOString()).toBe(
      "2026-11-16T12:00:00.000Z",
    ); // sáb → seg
    expect(nextOpening([], new Date())).toBeNull();
  });

  it("janela que atravessa a meia-noite UTC (sábado 22:00–02:00)", () => {
    const night = [{ weekday: 6, startMin: 1320, endMin: 120 }];
    expect(isOpen(night, new Date("2026-11-14T23:00:00Z"))).toBe(true); // sábado
    expect(isOpen(night, new Date("2026-11-15T01:30:00Z"))).toBe(true); // domingo de madrugada
    expect(isOpen(night, new Date("2026-11-15T02:00:00Z"))).toBe(false);
  });

  it("conversão HH:MM", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toHHMM(570)).toBe("09:30");
  });
});
