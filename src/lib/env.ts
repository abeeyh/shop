import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";

// Variáveis do servidor validadas na inicialização; nunca importar em componente de cliente.
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["local", "homologacao", "production"]).default("local"),
    APP_RELEASE: z.string().default("dev"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).optional(),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    // header confiável com o IP do cliente, que a CDN/proxy SOBRESCREVE (ex.: cf-connecting-ip).
    // Obrigatório em production: x-forwarded-for vindo direto do cliente é forjável (docs/16 §9).
    CLIENT_IP_HEADER: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(32).optional(),
    // rate limit compartilhado e pub/sub do chat (docs/03). Obrigatório em production (docs/09 §2).
    VALKEY_URL: z.url({ protocol: /^(redis|rediss|valkey|valkeys)$/ }).optional(),
    BETTERSTACK_SOURCE_TOKEN: z.string().min(1).optional(),
    BETTERSTACK_INGEST_HOST: z.string().min(1).optional(),
  })
  .refine((v) => v.APP_ENV !== "production" || v.CLIENT_IP_HEADER, {
    message: "CLIENT_IP_HEADER é obrigatório em production (docs/16 §9)",
    path: ["CLIENT_IP_HEADER"],
  })
  .refine((v) => v.APP_ENV !== "production" || v.VALKEY_URL, {
    message: "VALKEY_URL é obrigatório em production: rate limit é controle de segurança (docs/09 §2)",
    path: ["VALKEY_URL"],
  });

// "VAR=" vazio (como vem do .env.example) conta como não definida
const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));

export const env = schema.parse(defined);
