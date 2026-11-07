// Tabelas do banco (docs/04 — Modelo de dados). Cada feature acrescenta as suas aqui
// e gera a migração com `pnpm db:generate`.
import {
  bigserial,
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Log de acesso legal — Marco Civil art. 15, 6 meses (docs/16 §9). Não é ferramenta de depuração.
export const accessLogs = pgTable(
  "access_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ip: inet("ip"),
    port: integer("port"),
    userId: text("user_id"),
    sessionId: text("session_id"),
    method: text("method").notNull(),
    route: text("route").notNull(),
    requestId: text("request_id").notNull(),
  },
  (t) => [index("access_logs_occurred_at_idx").on(t.occurredAt)],
);

// Catálogo (docs/04 — Modelo de dados). Criado pelo admin; texto único para todos os idiomas (RN-84).
export const categoryKind = pgEnum("category_kind", ["gold", "raid", "dungeon"]); // RN-13
export const gameRegion = pgEnum("game_region", ["US", "EU"]); // RN-14

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: categoryKind("kind").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    region: gameRegion("region").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    priceUsdtCents: integer("price_usdt_cents").notNull(), // RN-12: inteiro, nunca float
    unit: text("unit"), // ex.: "per_1k_gold"
    options: jsonb("options").notNull().default({}),
    active: boolean("active").notNull().default(true),
    salesCount: integer("sales_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("products_category_region_idx").on(t.categoryId, t.region),
    check("products_price_positive", sql`${t.priceUsdtCents} > 0`),
  ],
);
