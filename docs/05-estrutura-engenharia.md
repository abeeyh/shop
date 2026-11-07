# 05 — Estrutura de engenharia

## Repositório

**Um repositório** com o app + infra em `infra/`. Separar repositórios só quando houver um segundo app de código próprio (ex.: mobile); com 3+ apps, virar monorepo (pnpm workspaces + Turborepo).

- Organização GitHub: [ORG]
- Repositório: [`abeeyh/shop`](https://github.com/abeeyh/shop) (privado). Branch padrão: **`dev`**.
- Fluxo: **issue → branch da tarefa → `dev` → `hom` → `main`** — regras em [13 §5](13-padroes-qualidade.md#5-tarefas-branches-e-prs). Tarefas e fases nas [issues](https://github.com/abeeyh/shop/issues) e [marcos](https://github.com/abeeyh/shop/milestones).
- Sem push direto em `dev`, `hom` e `main`; CI verde obrigatório. *Plano gratuito em repositório privado não tem proteção de branch: vale por disciplina + checks do CI; com GitHub Pro, ativar rulesets.*
- Environments: `homologacao` (branch `hom`) e `production` (tags `v*` da `main`, aprovação manual). `dev` não tem ambiente: só CI.

```
[projeto]/
├── docs/                      # planejamento (fonte da verdade)
├── infra/
│   ├── terraform/             # infraestrutura como código
│   └── app/                   # docker-compose, proxy reverso
├── messages/                  # traduções (se houver vários idiomas)
├── public/
├── src/
│   ├── i18n/                  # config de idiomas (se houver)
│   ├── app/[locale]/          # rotas (composição) — sem [locale] se for um idioma só
│   │   └── api/
│   ├── features/              # uma pasta por funcionalidade
│   │   └── <feature>/
│   │       ├── components/    # moléculas e organismos de domínio
│   │       ├── rules.ts       # regras de negócio puras
│   │       ├── schemas.ts     # zod da borda (form, action, rota)
│   │       ├── queries.ts     # acesso ao banco da feature
│   │       └── index.ts       # API pública da feature
│   ├── db/ (schema.ts, migrations/)
│   ├── lib/                   # adapters de serviços externos (payments/, email/), env (zod)
│   └── components/            # Atomic Design genérico — ver 11-design.md
│       ├── atoms/  molecules/  organisms/  templates/
├── tests/ (e2e/, factories/)
├── Dockerfile
├── .env.example
├── CLAUDE.md  CONTRIBUTING.md  README.md
```

Regras:
- Uma feature só importa outra por `features/<x>/index.ts`.
- Componentes seguem Atomic Design de [11](11-design.md): importação só para baixo; cores só por tokens.
- Padrões de código: [13](13-padroes-qualidade.md).

## Ambientes

| Ambiente | Onde | Banco |
|----------|------|-------|
| Local | `pnpm dev` + `docker compose` (`compose.yaml`) | Postgres 17 na porta 5433 e Valkey 8 na 6380 (mudáveis por `SHOP_DB_PORT` / `SHOP_CACHE_PORT`) |
| Integração | branch `dev` — só CI, sem deploy | — |
| Homologação | branch `hom`, deploy automático — [onde] | Banco próprio, dados fictícios; pagamento em modo teste |
| Produção | tag `vX.Y.Z` da `main`, aprovação manual — [onde] | Banco próprio; pagamento em modo real |

## CI/CD

Pipeline completo em [13](13-padroes-qualidade.md#7-cicd). Resumo:

1. PR para `dev` (com `Refs #N`; a issue fecha só em produção): lint, typecheck, testes com cobertura, build, E2E, audit, título semântico.
2. PR de promoção `dev` → `hom` (merge commit).
3. Merge em `hom`: build da imagem → registry → deploy em homologação → migrações → smoke test.
4. PR de promoção `hom` → `main` (merge commit) → release-please atualiza o Release PR.
5. Merge do Release PR: tag `vX.Y.Z` → produção com aprovação manual → back-merge `main` → `hom` e `main` → `dev`.
6. Rollback: redeploy da tag anterior. Infra: `terraform plan` no PR, `apply` manual.

## Operação

- Backups automáticos do banco + cópia diária para armazenamento separado; restauração testada 1×/mês.
- Atualizações automáticas de segurança do SO; imagens reconstruídas semanalmente.
- Monitoramento: erros (Sentry), uptime externo (Better Stack Uptime), alertas de disco/CPU/banda — detalhes em [16](16-observabilidade.md).
- Logs JSON da aplicação no **Better Stack gratuito** (3 dias, todos os ambientes); log de acesso legal no PostgreSQL por 6 meses, com limpeza diária; sem dados pessoais nos logs da aplicação ([16 §3](16-observabilidade.md#3-padrão-de-log), [§8–9](16-observabilidade.md#8-better-stack--configuração-e-custo)).
- Bugs: GitHub Issues com o template `.github/ISSUE_TEMPLATE/bug.yml` e severidade S1–S3 ([16 §5](16-observabilidade.md#5-fluxo-de-um-bug)).
- Dependências com versão fixada; Dependabot para npm, Docker e Terraform.

## Compatibilidade

Testar antes de cada release: Chrome/Edge Windows, Chrome macOS, Firefox, Safari, Chrome Android, Safari iOS.

## Agentes

Subagentes do Claude Code em `.claude/agents/` — ver [12](12-agentes.md).
