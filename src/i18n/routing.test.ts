import { describe, expect, it } from "vitest";
import { canonicalLocale } from "./routing";

describe("canonicalLocale", () => {
  it("código da URL → BCP 47 canônico para <html lang> e Intl", () => {
    expect(canonicalLocale("pt-br")).toBe("pt-BR");
    expect(canonicalLocale("zh-hant")).toBe("zh-Hant");
    expect(canonicalLocale("zh-hans")).toBe("zh-Hans");
    expect(canonicalLocale("en")).toBe("en");
  });
});
