import { describe, expect, it } from "vitest";
import { isTimezone, timezoneOptions } from "./rules";

describe("preferências (RN-82)", () => {
  it("RN-82: aceita fuso IANA válido e recusa lixo", () => {
    expect(isTimezone("America/Sao_Paulo")).toBe(true);
    expect(isTimezone("Asia/Taipei")).toBe(true);
    expect(isTimezone("UTC")).toBe(true);
    expect(isTimezone("Marte/Olympus")).toBe(false);
    expect(isTimezone("<script>")).toBe(false);
    expect(isTimezone("a".repeat(65))).toBe(false);
    expect(isTimezone(42)).toBe(false);
  });

  it("lista de fusos inclui o atual mesmo fora da lista oficial", () => {
    expect(timezoneOptions("Asia/Calcutta")).toContain("Asia/Calcutta");
    expect(timezoneOptions(null).length).toBeGreaterThan(300);
  });
});
