import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // next-intl importa "next/server" sem extensão; o Vite resolve, o Node puro não
    server: { deps: { inline: ["next-intl"] } },
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    coverage: {
      include: ["src/features/**", "src/lib/**"],
    },
  },
});
