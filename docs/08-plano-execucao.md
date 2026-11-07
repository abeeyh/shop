# 08 — Plano de execução

Cada fase termina com algo usável em homologação/produção e tem um critério "Pronto quando".

## Linha do tempo

```mermaid
gantt
  title [Projeto] — roadmap
  dateFormat YYYY-MM-DD
  axisFormat %d/%m
  section MVP
  F0 Fundação          :f0, [AAAA-MM-DD], 8d
  F1 Vitrine i18n+fuso :f1, after f0, 7d
  F2 Checkout USDT     :f2, after f1, 7d
  F3 Admin e entrega   :f3, after f2, 5d
  F4 Cartão            :f4, after f3, 5d
  F5 Suporte e chat    :f5, after f4, 7d
  Beta fechado         :fb, after f5, 10d
  section Pós-MVP
  Lançamento público   :fl, after fb, 5d
```

## F0 — Fundação (padrão para todo projeto)

- [ ] Domínio e DNS.
- [x] Repositório [`abeeyh/shop`](https://github.com/abeeyh/shop) privado, branches `dev` (padrão), `hom` e `main`, tarefas como issues por marco ([13 §5](13-padroes-qualidade.md#5-tarefas-branches-e-prs)).
- [ ] Environments `homologacao` e `production` (com a hospedagem). Proteção de branch exige GitHub Pro.
- [x] App base (Next.js 16 + TypeScript + Tailwind 4), `output: "standalone"`, `Dockerfile` (sem root, healthcheck). *shadcn/ui entra junto com o primeiro componente que precisar dele.*
- [x] Idiomas: `next-intl` com os 6 idiomas, detecção, prefixos `/pt-br`, `/zh-hant`, `/zh-hans`, checagem de chaves (`pnpm i18n:check`).
- [x] `docker compose` local (Postgres 17, Valkey 8).
- [x] Qualidade ([13](13-padroes-qualidade.md)): ESLint (boundaries, a11y do Next), Prettier, Husky (pre-commit, commit-msg com bloqueio de coautoria de IA, pre-push), commitlint, `.nvmrc`, `packageManager`, versões fixas.
- [x] `src/lib/env.ts` com validação; `.env.example`.
- [x] Tokens do design system em `globals.css` ([11](11-design.md)), fontes Inter + Mulish, átomo `Button`.
- [ ] Infra como código (Terraform) do ambiente de homologação.
- [x] CI (lint, format, typecheck, i18n, testes com cobertura, build, audit, título semântico, coautoria de IA, destino do PR) e back-merge `main` → `hom`.
- [ ] Build/push da imagem + deploy em homologação a partir de `hom` (depende da hospedagem).
- [x] E2E com Playwright no CI (celular e desktop): idiomas, 404, rolagem horizontal, `x-request-id`, health.
- [x] release-please (config + manifest; primeira release `0.1.0`), Dependabot (alvo `hom`).
- [ ] Backup do banco (depende da hospedagem).
- [x] `logger` pino com mascaramento + envio ao Better Stack quando há token; `/api/health`.
- [ ] Observabilidade restante ([16](16-observabilidade.md)): `requestId`, Sentry (servidor + navegador, release = tag, source maps no CI), Better Stack gratuito (sources `shop-homologacao` e `shop-production`, alerta em 70% do limite, monitor de uptime em `/api/health`), tabela `access_logs` + cron de limpeza de 6 meses, alertas mínimos, template de issue `bug`.

**Pronto quando:** merge em `hom` publica a página "em breve" em homologação, e a promoção para `main` + Release PR publica `v0.1.0` em produção, com HTTPS e CI verde.

## F1 — Vitrine (idiomas, região, fuso)

- [x] next-intl com 6 idiomas, detecção e seletor (RN-80, RN-81); checagem de chaves no CI.
- [x] Seletores de região US/EU (RN-14) e de fuso com detecção automática (RN-82, RN-83).
- [x] Catálogo do banco com preço em USDT e estimativa em moeda local (RN-12, RN-13, RN-18). *Cotações reais: #63.*
- [x] Agenda de raids com slots em UTC exibidos no fuso escolhido (RN-16, RN-83).

**Pronto quando:** em homologação, um visitante de outro país vê o site no idioma e fuso dele, troca os dois e vê preços em USDT.

## F2 — Checkout em USDT

- [x] Carrinho com total recalculado no servidor (RN-20).
- [x] Adapter `crypto` + fatura + IPN assinado e idempotente (RN-30, RN-32, RN-33, RN-35, RN-37). *Coberto com o adapter fake (mesma assinatura do NOWPayments); sandbox real depende da conta.*
- [x] Reserva de gold/vaga e expiração em 30 min (RN-34). *Agendar `/api/cron/expire-orders` a cada minuto na hospedagem (#2).*

**Pronto quando:** pagamento de teste em USDT (sandbox) leva o pedido a `pago`; pagamento a menor leva a `pagamento_parcial`; IPN repetido não duplica.

## F3 — Admin e entrega

- [ ] Dashboard admin com 2FA (RN-02, RN-70): **categorias e produtos** (RN-13, RN-19, RN-72, RN-73), preços, slots, pedidos. *Feito: login com 2FA, categorias, produtos e preços (#20). Faltam slots e pedidos (#23).*
- [x] **Promoções por tempo** (RN-21 a RN-24) e **cupons** (RN-25 a RN-29) com regra "vale o maior" (RN-26). *Datas digitadas em UTC no admin. Ordenação por preço final e filtro "em promoção": #74.*
- [ ] Auditoria de alterações de preço, promoção e cupom (RN-71).
- [ ] Fluxo `pago → em_andamento → concluido` com prova de entrega (RN-50, RN-52).
- [ ] "Reportar problema" e lista de reportes no admin (RN-90, RN-91).

**Pronto quando:** admin cria categoria, produto, promoção e cupom pelo dashboard; um pedido de teste recebe o maior desconto correto; e o admin conclui o pedido com prova anexada, visível ao cliente no idioma dele.

## F4 — Cartão

- [ ] Provedor de cartão escolhido e com aceitação do setor confirmada por escrito ([14 §3](14-pagamentos-internacionais.md#3-cartão)).
- [ ] Cotação travada 15 min, 3-D Secure, chargeback → `contestado` (RN-36, RN-38, RN-51).

**Pronto quando:** pagamento de teste com cartão leva o pedido a `pago` com cotação e valor cobrado gravados.

## F5 — Suporte e chat

- [ ] Papéis `cliente`/`suporte`/`admin`, convite de equipe, 2FA obrigatório, permissões por papel (RN-04 a RN-07).
- [ ] Chat próprio: SSE + PostgreSQL + pub/sub do Valkey; widget em todas as páginas; fila no dashboard (RN-92, RN-93, RN-98).
- [ ] E-mail de mensagem nova com link assinado (RN-94); aviso de credenciais e mascaramento (RN-95); anexos de imagem (RN-96); limites e CAPTCHA (RN-97).
- [ ] Horário de atendimento e modo offline (RN-99).
- [ ] Documentação interna `/admin/docs` para admin e suporte (RN-74).

**Pronto quando:** um visitante em `zh-Hant` abre conversa, um atendente de suporte responde em tempo real pelo dashboard, o visitante fecha a aba e recebe o e-mail com o link, retoma a conversa; e o suporte não consegue abrir a tela de preços ou cupons (403).

## Beta fechado

- [ ] Usuários convidados.
- [ ] Matriz de navegadores e dispositivos (360 px a 1920 px).
- [ ] Teste de carga.
- [ ] Medir custo real e preencher [10](10-custos.md).

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Provedor de pagamento bloquear a conta (setor proibido) | alto | Confirmar aceitação por escrito; USDT como meio principal |
| Chargeback alto no cartão | alto | 3-D Secure, prova de entrega, cartão só depois do USDT (F4) |
| Ação da Blizzard contra a loja ou contas de clientes | médio | Self-play apenas (RN-03); Termos claros; não usar marcas/imagens oficiais |
| Tradução ruim em 6 idiomas | médio | Revisão nativa antes do lançamento; chaves checadas no CI |
| Regulação/tributação de cripto | médio | Contador antes do lançamento ([14 §5](14-pagamentos-internacionais.md#5-brasil-regulação-e-impostos-confirmar-com-contador)) |
