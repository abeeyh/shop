import { describe, expect, it } from "vitest";
import { customerCanReply, sortQueue, statusAfterCustomerMessage } from "./rules";

describe("conversa de suporte (RN-93, RN-98)", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("RN-93: resolvida reabre com resposta em até 7 dias; depois disso não", () => {
    expect(customerCanReply({ status: "aberta", resolvedAt: null }, now)).toBe(true);
    expect(customerCanReply({ status: "resolvida", resolvedAt: new Date("2026-11-14T12:00:00Z") }, now)).toBe(
      true,
    );
    expect(customerCanReply({ status: "resolvida", resolvedAt: new Date("2026-11-12T12:00:00Z") }, now)).toBe(
      false,
    );
    expect(statusAfterCustomerMessage("resolvida")).toBe("aberta");
    expect(statusAfterCustomerMessage("em_atendimento")).toBe("em_atendimento");
  });

  it("RN-98: idiomas do atendente primeiro, depois ordem de chegada", () => {
    const at = (m: number) => new Date(now.getTime() + m * 60_000);
    const q = sortQueue(
      [
        { id: 1, locale: "de", createdAt: at(1) },
        { id: 2, locale: "pt-br", createdAt: at(3) },
        { id: 3, locale: "en", createdAt: at(2) },
        { id: 4, locale: "pt-br", createdAt: at(0) },
      ],
      ["pt-br"],
    );
    expect(q.map((x) => x.id)).toEqual([4, 2, 1, 3]);
  });
});
