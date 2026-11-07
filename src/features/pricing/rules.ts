import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// Tabelas de preço como configuração (docs/13 §2: nada de if espalhado). RN-15 a RN-17.
export const PRICING = {
  gold: { minK: 50, maxK: 5000, stepK: 50 }, // RN-15: preço por 1.000 gold
  raid: { loot: { none: 1, armor: 1.3, full: 1.8 } }, // RN-16: multiplicador da opção de loot
  dungeon: {
    // RN-17: multiplicador por faixa de nível da chave; "timed" +20%
    levels: [
      { from: 2, to: 10, factor: 1 },
      { from: 11, to: 13, factor: 1.3 },
      { from: 14, to: 15, factor: 1.6 },
    ],
    timed: 1.2,
    maxRuns: 10,
  },
} as const;

export type LootOption = keyof typeof PRICING.raid.loot;
export type ItemOptions =
  | { kind: "gold"; realm: string; faction: "alliance" | "horde"; character: string }
  | { kind: "raid"; loot: LootOption }
  | { kind: "dungeon"; keyLevel: number; timed: boolean };

const levelFactor = (level: number) =>
  PRICING.dungeon.levels.find((b) => level >= b.from && level <= b.to)?.factor;

// Preço unitário em centavos de USDT (RN-12: inteiro; arredonda para o centavo mais próximo).
// `quantity` multiplica fora: gold = milhares; M+ = runs; raid = 1.
export function unitPriceCents(basePriceCents: number, options: ItemOptions): number {
  switch (options.kind) {
    case "gold":
      return basePriceCents;
    case "raid":
      return Math.round(basePriceCents * PRICING.raid.loot[options.loot]);
    case "dungeon": {
      const factor = levelFactor(options.keyLevel);
      if (factor === undefined) throw new Error("nível de chave fora da tabela");
      return Math.round(basePriceCents * factor * (options.timed ? PRICING.dungeon.timed : 1));
    }
  }
}

export const lineTotalCents = (unitCents: number, quantity: number) => unitCents * quantity;
