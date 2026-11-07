import { describe, expect, it } from "vitest";
import { isRegion, isTimezone, regionForTimezone, regionToSave, timezoneOptions } from "./rules";

describe("preferências (RN-14, RN-82)", () => {
  it("RN-82: aceita fuso IANA válido e recusa lixo", () => {
    expect(isTimezone("America/Sao_Paulo")).toBe(true);
    expect(isTimezone("Asia/Taipei")).toBe(true);
    expect(isTimezone("UTC")).toBe(true);
    expect(isTimezone("Marte/Olympus")).toBe(false);
    expect(isTimezone("<script>")).toBe(false);
    expect(isTimezone("a".repeat(65))).toBe(false);
    expect(isTimezone(42)).toBe(false);
  });

  it("RN-14: só US ou EU", () => {
    expect(isRegion("US")).toBe(true);
    expect(isRegion("EU")).toBe(true);
    expect(isRegion("BR")).toBe(false);
  });

  it("RN-14: sugere a região pelo fuso", () => {
    expect(regionForTimezone("America/Sao_Paulo")).toBe("US");
    expect(regionForTimezone("Pacific/Auckland")).toBe("US");
    expect(regionForTimezone("Australia/Sydney")).toBe("US"); // Oceanic
    expect(regionForTimezone("Asia/Singapore")).toBe("US");
    expect(regionForTimezone("UTC")).toBe("US"); // desconhecido → padrão da RN-14
    expect(regionForTimezone("Europe/Berlin")).toBe("EU");
    expect(regionForTimezone("Africa/Johannesburg")).toBe("EU");
    expect(regionForTimezone("Atlantic/Canary")).toBe("EU");
  });

  it("lista de fusos inclui o atual mesmo fora da lista oficial", () => {
    expect(timezoneOptions("Asia/Calcutta")).toContain("Asia/Calcutta");
    expect(timezoneOptions(null).length).toBeGreaterThan(300);
  });

  it("RN-14: região escolhida vence; detecção só sugere se ainda não há região", () => {
    expect(regionToSave({ region: "EU", hasRegion: true })).toBe("EU");
    expect(regionToSave({ timezone: "Europe/Paris", auto: true, hasRegion: false })).toBe("EU");
    expect(regionToSave({ timezone: "Europe/Paris", auto: true, hasRegion: true })).toBeNull();
    expect(regionToSave({ timezone: "Europe/Paris", hasRegion: false })).toBeNull(); // troca manual de fuso não muda região
    expect(regionToSave({ region: "BR", hasRegion: false })).toBeNull();
  });
});
