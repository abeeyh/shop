import pino from "pino";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { maskEmail, REDACT_PATHS } from "./logger";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const log = pino({ redact: { paths: REDACT_PATHS, censor: "[redacted]" } }, stream);
  return { log, lines };
}

describe("logger", () => {
  it("mascara chaves proibidas (docs/16 §3)", () => {
    const { log, lines } = capture();
    log.info(
      { password: "s3cret", token: "abc", headers: { authorization: "Bearer x" }, payment: { card: "4111" } },
      "evento",
    );
    const out = lines.join("");
    expect(out).not.toMatch(/s3cret|abc|Bearer x|4111/);
    expect(out).toContain("[redacted]");
  });

  it("maskEmail não expõe o e-mail completo", () => {
    expect(maskEmail("joao.silva@dominio.com.br")).toBe("j***@d***.com.br");
    expect(maskEmail("invalido")).toBe("***");
    expect(maskEmail("@x.com")).toBe("***");
  });
});
