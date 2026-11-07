import { z } from "zod";

// Variáveis do servidor validadas na inicialização; nunca importar em componente de cliente.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "homologacao", "production"]).default("local"),
  APP_RELEASE: z.string().default("dev"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).optional(),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  // header confiável com o IP do cliente, definido pela CDN/proxy da hospedagem (docs/16 §9)
  CLIENT_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
  CRON_SECRET: z.string().min(32).optional(),
  BETTERSTACK_SOURCE_TOKEN: z.string().min(1).optional(),
  BETTERSTACK_INGEST_HOST: z.string().min(1).optional(),
});

// "VAR=" vazio (como vem do .env.example) conta como não definida
const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));

export const env = schema.parse(defined);
