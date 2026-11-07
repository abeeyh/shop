## O que muda

<!-- Uma ou duas frases. Título do PR em Conventional Commits: feat(escopo): ... -->

Refs #<!-- nº da issue (obrigatório em PR para dev; não use Closes — a issue fecha só em produção) -->

## Destino

- [ ] `dev` (tarefa, squash)
- [ ] `hom` (promoção de `dev`, merge commit)
- [ ] `main` (promoção de `hom` com merge commit, ou `hotfix/*`)

## Conformidade

- [ ] Conferido contra `docs/` (regras RN, stack, arquitetura, UML, design, segurança)
- Regras afetadas: <!-- ex.: RN-03 — ou "nenhuma" -->
- [ ] Docs atualizados no mesmo PR (se alguma regra mudou)

## Testes

- [ ] Testes unitários/integração para o comportamento novo (com ID RN)
- [ ] E2E atualizado (se mudou fluxo crítico)
- [ ] Bug corrigido tem teste que o reproduz

## Segurança (se tocar auth, dados pessoais, webhooks ou infra)

- [ ] Revisado pelo agente `seguranca` / checklist do `docs/09`
- [ ] Sem segredos, sem dados pessoais em log

## Banco

- [ ] Sem migração
- [ ] Migração incluída e compatível com a versão anterior do código

## Telas (se houver)

- [ ] Só tokens da paleta; Atomic Design respeitado
- [ ] Componentes reutilizados com variantes; `className` na chamada só para layout
- [ ] Textos traduzidos em todos os idiomas do projeto, nenhum texto fixo
- [ ] Responsivo (360 px a 1920 px) e acessível (teclado, foco, contraste)
