import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";

// Variáveis do servidor validadas na inicialização; nunca importar em componente de cliente.
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // sem padrão no build de produção: deploy sem APP_ENV não sobe (e nunca cai no pagamento fake)
    APP_ENV: z.enum(["local", "homologacao", "production"]),
    APP_RELEASE: z.string().default("dev"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).optional(),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    // header confiável com o IP do cliente, que a CDN/proxy SOBRESCREVE (ex.: cf-connecting-ip).
    // Obrigatório em production: x-forwarded-for vindo direto do cliente é forjável (docs/16 §9).
    CLIENT_IP_HEADER: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(32).optional(),
    // rate limit compartilhado e pub/sub do chat (docs/03). Obrigatório em production (docs/09 §2).
    VALKEY_URL: z.url({ protocol: /^(redis|rediss|valkey|valkeys)$/ }).optional(),
    // docs/09 §2: requisições por minuto por IP no proxy (padrão 300). O E2E sobe o valor: todas as
    // requisições dele saem do mesmo IP. O comportamento do limite é coberto pelos testes de integração.
    RATE_LIMIT_REQUESTS_PER_MIN: z.coerce.number().int().positive().default(300),
    BETTERSTACK_SOURCE_TOKEN: z.string().min(1).optional(),
    BETTERSTACK_INGEST_HOST: z.string().min(1).optional(),
    // URL pública da loja: callback do IPN e link de volta da fatura (docs/14 §2)
    APP_URL: z.url().default("http://localhost:3000"),
    // gateway USDT (docs/14 §2). "fake" só em local/homologação sem conta.
    PAYMENTS_PROVIDER: z.enum(["fake", "nowpayments"]).default("fake"),
    NOWPAYMENTS_API_KEY: z.string().min(1).optional(),
    NOWPAYMENTS_IPN_SECRET: z.string().min(16).optional(),
    NOWPAYMENTS_SANDBOX: z.stringbool().default(true),
    // assina o link do pedido (/pedido/[id]?t=) — dono sem conta (RN-01)
    ORDER_LINK_SECRET: z.string().min(32).optional(),
  })
  .refine((v) => v.APP_ENV !== "production" || v.CLIENT_IP_HEADER, {
    message: "CLIENT_IP_HEADER é obrigatório em production (docs/16 §9)",
    path: ["CLIENT_IP_HEADER"],
  })
  // RN-32: fake e segredos de desenvolvimento (públicos no repo) só em local
  .refine((v) => v.APP_ENV === "local" || (v.PAYMENTS_PROVIDER === "nowpayments" && v.ORDER_LINK_SECRET), {
    message: "fora de local exige PAYMENTS_PROVIDER=nowpayments e ORDER_LINK_SECRET (docs/14, RN-32)",
    path: ["PAYMENTS_PROVIDER"],
  })
  .refine((v) => v.APP_ENV !== "production" || !v.NOWPAYMENTS_SANDBOX, {
    message: "production não usa o sandbox do NOWPayments (PAYMENTS_PROVIDER)",
    path: ["PAYMENTS_PROVIDER"],
  })
  .refine(
    (v) => v.PAYMENTS_PROVIDER !== "nowpayments" || (v.NOWPAYMENTS_API_KEY && v.NOWPAYMENTS_IPN_SECRET),
    {
      message: "NOWPAYMENTS_API_KEY e NOWPAYMENTS_IPN_SECRET são obrigatórios com o provedor nowpayments",
      path: ["NOWPAYMENTS_API_KEY"],
    },
  )
  .refine((v) => v.APP_ENV !== "production" || v.VALKEY_URL, {
    message: "VALKEY_URL é obrigatório em production: rate limit é controle de segurança (docs/09 §2)",
    path: ["VALKEY_URL"],
  });

// "VAR=" vazio (como vem do .env.example) conta como não definida
const defined: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);
if (!defined.APP_ENV && defined.NODE_ENV !== "production") defined.APP_ENV = "local";

export const env = schema.parse(defined);
