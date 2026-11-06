# Contribuindo

Regras completas em [docs/13-padroes-qualidade.md](docs/13-padroes-qualidade.md). Resumo:

## Antes de começar

1. Faça a checagem de conformidade do [CLAUDE.md](CLAUDE.md) contra `docs/`.
2. Crie a branch a partir de `hom`: `feat/<assunto>`, `fix/<assunto>`, `refactor/<assunto>`, `docs/<assunto>`, `chore/<assunto>`.
3. Fluxo: **branch → PR para `hom` (squash) → PR `hom` → `main` (merge commit) → release**. Urgência: `hotfix/*` a partir de `main`, depois back-merge em `hom`. Detalhes em [docs/13 §5](docs/13-padroes-qualidade.md#5-branches-e-prs).

## Código

- TypeScript `strict`, sem `any`, sem `console.log`, sem código comentado.
- Código em inglês; interface no(s) idioma(s) definido(s) no projeto, sem texto fixo no componente.
- Regras de negócio em `features/<x>/rules.ts`, com teste citando o ID RN.
- Componentes em Atomic Design, só com tokens, reutilizando variantes ([docs/11-design.md](docs/11-design.md)).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/pt-br/), validados pelo commitlint:

```
feat(<escopo>): descrição no imperativo
fix(<escopo>): descrição
feat(<escopo>)!: mudança que quebra compatibilidade
```

Escopos: definidos em [docs/13](docs/13-padroes-qualidade.md#3-commits-semânticos).

### Regra obrigatória

**Commits nunca devem ter o Claude (ou qualquer IA) como coautor.** Bloqueado pelo hook `commit-msg` e conferido no CI.

## Hooks (Husky)

- `pre-commit`: lint + format nos arquivos alterados.
- `commit-msg`: commitlint + bloqueio de coautoria de IA.
- `pre-push`: typecheck + testes unitários.

## Pull Request

- PR para `hom`, merge por **squash**; título do PR semântico.
- Promoção `hom` → `main` por **merge commit**, nunca squash (o changelog depende dos commits).
- Preencha o [template](.github/pull_request_template.md).
- CI verde obrigatório.

## Versões

SemVer automático via **release-please** na `main`. `0.x` até o lançamento público; `1.0.0` no lançamento. `CHANGELOG.md` gerado, nunca editado à mão.
