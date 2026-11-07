import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit não lê .env.local sozinho; no CI a variável vem do ambiente
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
