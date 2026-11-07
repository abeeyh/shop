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
    // RN-100: busca por similaridade (pg_trgm, migração 0003)
    index("products_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops")),
    index("products_description_trgm_idx").using("gin", t.description.op("gin_trgm_ops")),
    check("products_price_positive", sql`${t.priceUsdtCents} > 0`),
  ],
);

// Agenda de raids (RN-16): horário em UTC (RN-83), vagas limitadas; reserved sobe na reserva do checkout (RN-34)
export const raidSlots = pgTable(
  "raid_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull(),
    reserved: integer("reserved").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("raid_slots_product_starts_idx").on(t.productId, t.startsAt),
    check(
      "raid_slots_capacity",
      sql`${t.capacity} > 0 and ${t.reserved} >= 0 and ${t.reserved} <= ${t.capacity}`,
    ),
  ],
);

// Carrinho (RN-01 visitante, RN-20 total recalculado no servidor). Identificado por cookie httpOnly.
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponCode: text("coupon_code"), // RN-25: guardado em minúsculas; validado a cada leitura (RN-27)
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    raidSlotId: uuid("raid_slot_id").references(() => raidSlots.id),
    quantity: integer("quantity").notNull(), // gold: milhares; M+: runs; raid: 1
    options: jsonb("options").notNull().default({}), // validado por tipo (features/cart/schemas.ts)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId), check("cart_items_quantity", sql`${t.quantity} > 0`)],
);

// Pedido (RN-50). Preços congelados no checkout; só o IPN assinado muda para pago (RN-32).
export const orderStatus = pgEnum("order_status", [
  "pendente",
  "pagamento_parcial",
  "pago",
  "em_andamento",
  "concluido",
  "expirado",
  "reembolsado",
  "contestado",
]);
export const paymentNetwork = pgEnum("payment_network", ["trc20", "erc20"]); // RN-37

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(), // RN-01; dado pessoal — nunca em log (docs/16)
    locale: text("locale").notNull(),
    status: orderStatus("status").notNull().default("pendente"),
    subtotalUsdtCents: integer("subtotal_usdt_cents").notNull(),
    discountUsdtCents: integer("discount_usdt_cents").notNull().default(0),
    totalUsdtCents: integer("total_usdt_cents").notNull(),
    discountSource: text("discount_source").notNull().default("none"), // promotion | coupon | none (RN-29)
    discountRef: text("discount_ref"), // id do cupom (a promoção fica em cada item)
    paymentMethod: text("payment_method").notNull().default("usdt"), // RN-35
    network: paymentNetwork("network"),
    provider: text("provider"),
    providerPaymentId: text("provider_payment_id"),
    payUrl: text("pay_url"),
    paidUsdtCents: integer("paid_usdt_cents"), // valor recebido segundo o IPN (RN-37)
    txHash: text("tx_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // RN-34
    assignedTo: text("assigned_to"), // equipe que assumiu a entrega (pago → em_andamento)
    ...timestamps,
  },
  (t) => [
    index("orders_status_expires_idx").on(t.status, t.expiresAt),
    check("orders_amounts", sql`${t.totalUsdtCents} > 0 and ${t.subtotalUsdtCents} >= ${t.totalUsdtCents}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    raidSlotId: uuid("raid_slot_id").references(() => raidSlots.id),
    productName: text("product_name").notNull(), // cópia: o admin pode renomear depois
    options: jsonb("options").notNull(), // realm/facção/personagem, loot, nível… (RN-15 a RN-17)
    unitPriceUsdtCents: integer("unit_price_usdt_cents").notNull(), // preço original (RN-29)
    discountUsdtCents: integer("discount_usdt_cents").notNull().default(0), // desconto da linha inteira
    promotionId: uuid("promotion_id"),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity", sql`${t.quantity} > 0`),
  ],
);

// Idempotência do IPN (RN-33): o mesmo evento chega mais de uma vez e só vale na primeira
export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id),
  type: text("type").notNull(),
  // conciliação e crédito/devolução (RN-37): o que o provedor disse que chegou
  paymentId: text("payment_id"),
  payCurrency: text("pay_currency"),
  paidUsdtCents: integer("paid_usdt_cents"),
  txHash: text("tx_hash"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// Autenticação (Better Auth — docs/03). Só equipe no MVP: cliente compra sem conta (RN-01).
// Ids em texto: gerados pelo Better Auth.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false), // RN-02, RN-05
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    password: text("password"), // hash (scrypt) — nunca a senha
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    ...timestamps,
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const twoFactors = pgTable(
  "two_factors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(), // criptografado pelo Better Auth
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factors_user_idx").on(t.userId), index("two_factors_secret_idx").on(t.secret)],
);

// Equipe (RN-04 a RN-06): quem não tem linha aqui não entra no admin
export const staffRole = pgEnum("staff_role", ["suporte", "admin"]);
export const staffProfiles = pgTable("staff_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  role: staffRole("role").notNull(),
  languages: text("languages")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  invitedBy: text("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Promoções e cupons (RN-21 a RN-29). Um alvo por registro: loja, uma categoria ou um produto.
export const discountType = pgEnum("discount_type", ["percent", "fixed"]);
export const discountScope = pgEnum("discount_scope", ["store", "category", "product"]);

const discountColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  type: discountType("type").notNull(),
  value: integer("value").notNull(), // percent 1–90 ou centavos de USDT
  scope: discountScope("scope").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  productId: uuid("product_id").references(() => products.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), // UTC (RN-83)
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
};

export const promotions = pgTable(
  "promotions",
  { ...discountColumns, name: text("name").notNull(), ...timestamps },
  (t) => [
    index("promotions_window_idx").on(t.active, t.endsAt),
    check("promotions_window", sql`${t.endsAt} > ${t.startsAt}`),
    check("promotions_value", sql`${t.value} > 0`),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    ...discountColumns,
    code: text("code").notNull().unique(), // minúsculas (RN-25)
    maxUses: integer("max_uses"),
    maxUsesPerEmail: integer("max_uses_per_email"),
    minOrderUsdtCents: integer("min_order_usdt_cents").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("coupons_window", sql`${t.endsAt} > ${t.startsAt}`),
    check("coupons_value", sql`${t.value} > 0`),
  ],
);

export const redemptionStatus = pgEnum("redemption_status", ["reserved", "used", "released"]);
// RN-27: reservado no checkout, usado no pagamento, liberado na expiração
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    email: text("email").notNull(),
    status: redemptionStatus("status").notNull().default("reserved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coupon_redemptions_coupon_idx").on(t.couponId, t.status)],
);

// Auditoria do dashboard (RN-71, RN-07): quem, quando, antes e depois. Só cresce — nunca editada.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: text("staff_id")
      .notNull()
      .references(() => users.id),
    entity: text("entity").notNull(), // category | product | promotion | coupon (e pedido com #23)
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(), // create | update
    before: jsonb("before"),
    after: jsonb("after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_created_idx").on(t.createdAt),
    index("audit_log_entity_idx").on(t.entity, t.entityId),
  ],
);

// Prova de entrega (RN-52). shortcut: link https para print/log; upload de arquivo entra com o storage (S3)
export const deliveries = pgTable("deliveries", {
  orderId: uuid("order_id")
    .primaryKey()
    .references(() => orders.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => users.id),
  proofUrl: text("proof_url").notNull(),
  note: text("note").notNull().default(""),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
});

// Reportes de problema (RN-91) — 1 ano (docs/16). E-mail opcional; nada mais de dado pessoal.
export const bugReportStatus = pgEnum("bug_report_status", ["novo", "resolvido"]);
export const bugReports = pgTable(
  "bug_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    description: text("description").notNull(),
    email: text("email"),
    page: text("page").notNull(), // só o caminho, sem query (pode ter token do pedido)
    errorId: text("error_id"), // digest do erro mostrado na tela (RN-90)
    requestId: text("request_id").notNull(),
    locale: text("locale").notNull(),
    region: text("region"),
    timezone: text("timezone"),
    userAgent: text("user_agent"),
    release: text("release").notNull(),
    status: bugReportStatus("status").notNull().default("novo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bug_reports_status_created_idx").on(t.status, t.createdAt)],
);
