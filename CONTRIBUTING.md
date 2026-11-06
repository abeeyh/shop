# Contribuindo

Regras completas em [docs/13-padroes-qualidade.md](docs/13-padroes-qualidade.md). Resumo:

## Antes de começar

1. Faça a checagem de conformidade do [CLAUDE.md](CLAUDE.md) contra `docs/`.
2. **Toda tarefa tem uma issue** ([template `tarefa`](.github/ISSUE_TEMPLATE/tarefa.yml)). Sem issue, sem branch.
3. Crie a branch a partir de `dev`: `<tipo>/<nº-da-issue>-<assunto>`, ex.: `feat/14-seletor-de-fuso`.
4. Fluxo: **issue → branch → PR para `dev` com `Closes #<nº>` (squash) → PR `dev` → `hom` (merge commit) → PR `hom` → `main` (merge commit) → release**. Urgência: `hotfix/<nº>-<assunto>` a partir de `main`, depois back-merge em `hom` e `dev`. Detalhes em [docs/13 §5](docs/13-padroes-qualidade.md#5-tarefas-branches-e-prs).

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

- PR da tarefa para `dev`, merge por **squash**; título do PR semântico; corpo com `Closes #<nº>`.
- Promoções `dev` → `hom` e `hom` → `main` por **merge commit**, nunca squash (o changelog depende dos commits).
- Preencha o [template](.github/pull_request_template.md).
- CI verde obrigatório.

## Versões

SemVer automático via **release-please** na `main`. `0.x` até o lançamento público; `1.0.0` no lançamento. `CHANGELOG.md` gerado, nunca editado à mão.
