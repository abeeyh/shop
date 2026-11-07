import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // transport do pino carregado por string num worker: precisa ficar fora do bundle
  serverExternalPackages: ["@logtail/pino"],
  // RN-74: /admin/docs lê os arquivos de docs/ do próprio build (fonte única, sem cópia)
  outputFileTracingIncludes: { "/**": ["./docs/*.md"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
