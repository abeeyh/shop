import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/db";
import { accounts, sessions, twoFactors, users, verifications } from "@/db/schema";
import { env } from "@/lib/env";

const DEV_SECRET = "dev-better-auth-secret-only-for-local-and-tests"; // público: só vale em APP_ENV=local

// Equipe (convite, RN-04; 2FA TOTP, RN-02/RN-05) e cliente (cadastro opcional, RN-107). Usado só por
// Server Actions via auth.api — não há rota pública /api/auth (menos superfície): o cadastro só acontece
// pela action signUp (limite por IP, senha vazada recusada, sem revelar e-mail existente).
export const auth = betterAuth({
  appName: "Shop",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET ?? (env.APP_ENV === "local" ? DEV_SECRET : undefined),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      twoFactor: twoFactors,
    },
  }),
  // autoSignIn desligado: cadastro novo e e-mail já usado têm a mesma resposta (docs/09 "Nunca")
  // #107: 8+; maiúscula, minúscula e número conferidos nas actions (lib/password.ts)
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: false },
  // cliente: 7 dias; a equipe tem teto de 12 h conferido em getStaff (features/auth/staff.ts)
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER ?? "x-forwarded-for"] } },
  telemetry: { enabled: false }, // docs/09: nada para terceiros sem necessidade
  // o logger do Better Auth não passa pelo redact do pino e, em info, grava o e-mail de cadastro repetido
  // (revela quem tem conta — docs/16, docs/09 "Nunca"): fica fixo em warn
  logger: { level: "warn" },
  plugins: [twoFactor({ issuer: "Shop" }), nextCookies()],
});
