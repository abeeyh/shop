import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/db";
import { accounts, sessions, twoFactors, users, verifications } from "@/db/schema";
import { env } from "@/lib/env";

const DEV_SECRET = "dev-better-auth-secret-only-for-local-and-tests"; // público: só vale em APP_ENV=local

// Login só da equipe (RN-04): sem cadastro público; 2FA TOTP (RN-02, RN-05). Usado só por Server
// Actions via auth.api — não há rota pública /api/auth (menos superfície).
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
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 }, // equipe: 12 h
  advanced: { ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER ?? "x-forwarded-for"] } },
  telemetry: { enabled: false }, // docs/09: nada para terceiros sem necessidade
  plugins: [twoFactor({ issuer: "Shop" }), nextCookies()],
});
