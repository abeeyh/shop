# Shop

Loja de serviços de **World of Warcraft** (Retail US/EU): **Gold**, **Raids** e **Dungeons (Mythic+)**. Preço-base em **USDT**, pagamento em USDT ou cartão, site em 6 idiomas (en, fr, de, pt-BR, zh-Hant, zh-Hans) e horários no fuso do cliente.

- **Site:** [URL]
- **Status:** F0 (fundação) em andamento
- **Documentação:** [docs/](docs/README.md)

## Começo rápido (quando o código existir)

Requisitos: Node 24 (`.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
cp .env.example .env.local
docker compose up -d     # Postgres em 5433 e Valkey em 6380 (portas mudáveis por SHOP_DB_PORT / SHOP_CACHE_PORT)
pnpm db:migrate
pnpm db:seed
pnpm dev                 # http://localhost:3000 → redireciona para /<idioma>
```

| Comando | Faz |
|---------|-----|
| `pnpm lint` / `pnpm format` | ESLint (com regra de camadas) / Prettier |
| `pnpm typecheck` | Gera os tipos de rota do Next e roda `tsc` |
| `pnpm test` / `pnpm test:coverage` | Vitest |
| `pnpm e2e` | Playwright contra o build de produção, em 390×844 e 1440×900 (rode `pnpm build` antes; `PW_CHANNEL=chrome` usa o Chrome instalado) |
| `pnpm i18n:check` | Confere as chaves nos 6 idiomas |
| `pnpm db:seed` | Catálogo inicial (categorias e produtos de exemplo; idempotente) |
| `pnpm db:generate` / `pnpm db:migrate` | Gera migração a partir de `src/db/schema.ts` / aplica no banco de `DATABASE_URL` |
| `pnpm db:studio` | Drizzle Studio (navegar no banco local) |
| `pnpm build` / `pnpm start` | Build `standalone` / servidor de produção (copia `public` e `.next/static`) |
| `docker build -t shop .` | Imagem de produção (sem root, com healthcheck) |

Regras de contribuição: [CONTRIBUTING.md](CONTRIBUTING.md).
