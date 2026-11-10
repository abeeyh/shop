import { describe, expect, it } from "vitest";
import { canRequestRefund, needsScheduling, nextStatus, outcomeOf, settle, staffSteps } from "./rules";

describe("estados do pedido (RN-50, RN-37)", () => {
  it("RN-50: aguardando_pagamento → pago | pagamento_parcial | cancelado | falha_pagamento", () => {
    expect(nextStatus("aguardando_pagamento", "paid")).toBe("pago");
    expect(nextStatus("aguardando_pagamento", "partial")).toBe("pagamento_parcial");
    expect(nextStatus("aguardando_pagamento", "expired")).toBe("cancelado");
    expect(nextStatus("aguardando_pagamento", "failed")).toBe("falha_pagamento");
  });

  it("#170: solicitado (ainda sem clicar em Pagar) não muda com IPN", () => {
    expect(nextStatus("solicitado", "paid")).toBeNull();
  });

  it("RN-50: pagamento_parcial → pago quando completa; falha vira falha_pagamento", () => {
    expect(nextStatus("pagamento_parcial", "paid")).toBe("pago");
    expect(nextStatus("pagamento_parcial", "failed")).toBe("falha_pagamento");
    expect(nextStatus("pagamento_parcial", "expired")).toBeNull();
  });

  it("RN-33: evento fora de ordem ou repetido não muda pedido pago/cancelado", () => {
    expect(nextStatus("pago", "paid")).toBeNull();
    expect(nextStatus("pago", "expired")).toBeNull();
    expect(nextStatus("cancelado", "paid")).toBeNull();
  });

  it("status do provedor: só finished/partially_paid/expired/failed contam", () => {
    expect(outcomeOf("finished")).toBe("paid");
    expect(outcomeOf("partially_paid")).toBe("partial");
    expect(outcomeOf("failed")).toBe("failed");
    expect(outcomeOf("confirming")).toBeNull();
    expect(outcomeOf("waiting")).toBeNull();
  });

  it("RN-37: valor pago menor que o total vira parcial mesmo com finished", () => {
    expect(settle("paid", 9999, 10000)).toBe("partial");
    expect(settle("paid", 10000, 10000)).toBe("paid");
    expect(settle("paid", 10500, 10000)).toBe("paid"); // a maior: crédito/devolução manual (RN-37)
  });
});

describe("passos da equipe (RN-50, RN-52, #170)", () => {
  it("pagamento manual: suporte confirma solicitado, aguardando e parcial", () => {
    for (const s of ["solicitado", "aguardando_pagamento", "pagamento_parcial"] as const)
      expect(staffSteps(s, "suporte")).toContain("confirmPayment");
  });

  it("pago → agendado → concluído parcial → concluído", () => {
    expect(staffSteps("pago", "suporte")).toEqual(["schedule", "requestRefund"]);
    expect(staffSteps("agendado", "suporte")).toEqual(["partial", "complete", "requestRefund"]);
    expect(staffSteps("concluido_parcial", "suporte")).toEqual(["complete", "requestRefund"]);
    expect(staffSteps("concluido", "suporte")).toEqual(["requestRefund"]);
  });

  it("RN-06: reembolsar e marcar falha só o admin", () => {
    expect(staffSteps("reembolso_solicitado", "suporte")).toEqual([]);
    expect(staffSteps("reembolso_solicitado", "admin")).toEqual(["refund"]);
    expect(staffSteps("pago", "admin")).toContain("fail");
    expect(staffSteps("pago", "suporte")).not.toContain("fail");
  });

  it("estados finais não têm passo", () => {
    for (const s of ["reembolsado", "cancelado", "falha_pagamento"] as const)
      expect(staffSteps(s, "admin")).toEqual([]);
  });

  it("#170: cliente só pede reembolso depois de pagar", () => {
    expect(canRequestRefund("pago")).toBe(true);
    expect(canRequestRefund("concluido")).toBe(true);
    expect(canRequestRefund("aguardando_pagamento")).toBe(false);
    expect(canRequestRefund("reembolso_solicitado")).toBe(false);
  });
});

describe("agendar com o suporte (RN-16, #94)", () => {
  const service = { options: { kind: "service" }, raidSlotId: null };
  it("pago com serviço sem horário pede agendamento; agendado, com horário ou sem pagar, não", () => {
    expect(needsScheduling({ status: "pago", items: [service] })).toBe(true);
    expect(needsScheduling({ status: "agendado", items: [service] })).toBe(false);
    expect(needsScheduling({ status: "aguardando_pagamento", items: [service] })).toBe(false);
    expect(needsScheduling({ status: "pago", items: [{ ...service, raidSlotId: "slot" }] })).toBe(false);
    expect(
      needsScheduling({ status: "pago", items: [{ options: { kind: "gold" }, raidSlotId: null }] }),
    ).toBe(false);
  });
});
