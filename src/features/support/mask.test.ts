import { describe, expect, it } from "vitest";
import { CARD_MASK, maskSensitive, SEED_MASK } from "./mask";

describe("mascaramento no chat (RN-95)", () => {
  it("cartão válido pelo Luhn some, com ou sem separador", () => {
    expect(maskSensitive("meu cartão 4111 1111 1111 1111 ok").text).toBe(`meu cartão ${CARD_MASK} ok`);
    expect(maskSensitive("5555-5555-5555-4444").masked).toBe(true);
    expect(maskSensitive("4111111111111111").text).toBe(CARD_MASK);
  });

  it("número que não passa no Luhn (pedido, telefone) continua", () => {
    expect(maskSensitive("pedido 4111 1111 1111 1112").masked).toBe(false);
    expect(maskSensitive("ligue 11 98765 4321").masked).toBe(false);
  });

  it("frase-semente de 12+ palavras some; frase normal continua", () => {
    const seed = "abandon ability able about above absent absorb abstract absurd abuse access accident";
    expect(maskSensitive(`minha seed: ${seed}`).text).toBe(`minha seed: ${SEED_MASK}`);
    expect(maskSensitive("Oi, quero saber quando a raid de hoje começa, obrigado!").masked).toBe(false);
  });
});
