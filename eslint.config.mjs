import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import boundaries from "eslint-plugin-boundaries";

// Regra de dependência: docs/13-padroes-qualidade.md §2
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/*", capture: ["feature"] },
        { type: "components", pattern: "src/components/**" },
        { type: "i18n", pattern: "src/i18n/**" },
        { type: "lib", pattern: "src/lib/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { types: ["features", "components", "i18n", "lib"] } } },
            },
            {
              from: { element: { type: "features" } },
              allow: { to: { element: { types: ["features", "components", "i18n", "lib"] } } },
            },
            {
              from: { element: { type: "components" } },
              allow: { to: { element: { types: ["components", "lib"] } } },
            },
            { from: { element: { type: "i18n" } }, allow: { to: { element: { types: ["i18n", "lib"] } } } },
            { from: { element: { type: "lib" } }, allow: { to: { element: { type: "lib" } } } },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "no-empty": "error",
      "max-depth": ["error", 3],
      complexity: ["error", 10],
    },
  },
  {
    // scripts de linha de comando escrevem no terminal
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
