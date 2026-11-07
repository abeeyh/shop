import { describe, expect, it } from "vitest";
import { CARD_MASK, maskSensitive, SEED_MASK } from "./mask";

describe("mascaramento no chat (RN-95)", () => {
  it("cartão válido pelo Luhn some, com ou sem separador", () => {
    expect(maskSensitive("meu cartão 4111 1111 1111 1111 ok").text).toBe(`meu cartão ${CARD_MASK} ok`);
    expect(maskSensitive("5555-5555-5555-4444").masked).toBe(true);
    expect(maskSensitive("4111111111111111").text).toBe(CARD_MASK);
  });

  it("cartão com validade/CVV, com pontos ou colado em texto também some (revisão da #28)", () => {
    expect(maskSensitive("4111 1111 1111 1111 12/27 123").text).toBe(CARD_MASK);
    expect(maskSensitive("4111 1111 1111 1111 123").text).toBe(CARD_MASK);
    expect(maskSensitive("4111.1111.1111.1111").text).toBe(CARD_MASK);
    expect(maskSensitive("cartao4111111111111111").text).toBe(`cartao${CARD_MASK}`);
  });

  it("número curto (telefone, horário, pedido) continua — 16 dígitos sem Luhn podem sumir: na dúvida, mascara", () => {
    expect(maskSensitive("pedido 8f14e45f, realm 3412").masked).toBe(false); // pedido é uuid
    expect(maskSensitive("ligue 11 98765 4321").masked).toBe(false);
    expect(maskSensitive("raid às 20:00, 10 vagas").masked).toBe(false);
  });

  it("frase-semente some em minúsculas, com maiúscula, numerada ou com vírgulas", () => {
    const words = "abandon ability able about above absent absorb abstract absurd abuse access accident";
    expect(maskSensitive(`minha seed: ${words}`).text).toBe(`minha seed: ${SEED_MASK}`);
    expect(maskSensitive(words.replace("abandon", "Abandon")).masked).toBe(true);
    expect(
      maskSensitive(
        words
          .split(" ")
          .map((w, i) => `${i + 1}. ${w}`)
          .join(" "),
      ).masked,
    ).toBe(true);
    expect(maskSensitive(words.split(" ").join(", ")).masked).toBe(true);
  });

  it("frase normal com palavras curtas continua", () => {
    expect(maskSensitive("Oi, quero saber quando a raid de hoje começa, obrigado!").masked).toBe(false);
    expect(maskSensitive("Hi, I paid but my order is still pending, can you check it?").masked).toBe(false);
  });
});
