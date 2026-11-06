// docs/13-padroes-qualidade.md §3
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "ui",
        "db",
        "infra",
        "deps",
        "docs",
        "catalog",
        "pricing",
        "schedule",
        "cart",
        "checkout",
        "payments",
        "orders",
        "admin",
        "preferences",
        "i18n",
        "support",
        "observability",
      ],
    ],
  },
};

export default config;
