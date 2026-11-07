import { describe, expect, it } from "vitest";
import { nextStatus, outcomeOf, settle } from "./rules";

describe("estados do pedido (RN-50, RN-37)", () => {
  it("RN-50: pendente → pago | pagamento_parcial | expirado", () => {
    expect(nextStatus("pendente", "paid")).toBe("pago");
    expect(nextStatus("pendente", "partial")).toBe("pagamento_parcial");
    expect(nextStatus("pendente", "expired")).toBe("expirado");
  });

  it("RN-50: pagamento_parcial → pago quando completa", () => {
    expect(nextStatus("pagamento_parcial", "paid")).toBe("pago");
    expect(nextStatus("pagamento_parcial", "expired")).toBeNull();
  });

  it("RN-33: evento fora de ordem ou repetido não muda pedido pago/expirado", () => {
    expect(nextStatus("pago", "paid")).toBeNull();
    expect(nextStatus("pago", "expired")).toBeNull();
    expect(nextStatus("expirado", "paid")).toBeNull();
  });

  it("status do provedor: só finished/partially_paid/expired/failed contam", () => {
    expect(outcomeOf("finished")).toBe("paid");
    expect(outcomeOf("partially_paid")).toBe("partial");
    expect(outcomeOf("failed")).toBe("expired");
    expect(outcomeOf("confirming")).toBeNull();
    expect(outcomeOf("waiting")).toBeNull();
  });

  it("RN-37: valor pago menor que o total vira parcial mesmo com finished", () => {
    expect(settle("paid", 9999, 10000)).toBe("partial");
    expect(settle("paid", 10000, 10000)).toBe("paid");
    expect(settle("paid", 10500, 10000)).toBe("paid"); // a maior: crédito/devolução manual (RN-37)
  });
});
