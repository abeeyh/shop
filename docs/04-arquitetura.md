# 04 — Arquitetura

## Visão geral

```mermaid
flowchart LR
  U[Navegador] -- HTTPS --> CDN[DNS / CDN]
  CDN --> APP[App Next.js<br/>UI + API<br/>6 idiomas]
  APP --> DB[(PostgreSQL)]
  APP --> C[(Cache / rate limit<br/>cotações)]
  APP -- fatura USDT --> CRY[Gateway cripto]
  APP -- checkout --> CARD[Cartão: on-ramp ou high-risk]
  CRY -- IPN assinado --> APP
  CARD -- webhook assinado --> APP
  APP --> FX[API de cotação USDT]
  APP --> MAIL[E-mail transacional]
  APP -. erros .-> ET[Sentry]
  APP -. logs JSON .-> LS[(Better Stack Logs<br/>gratuito)]
```

Observabilidade (erros, logs, alertas, fluxo de bug): [16](16-observabilidade.md).

## Backend

Dentro do próprio Next.js: Server Actions para formulários e Route Handlers para webhooks e cron. Nenhum serviço separado no MVP.

Regra de ouro: **toda decisão de negócio e de permissão acontece no backend.** Preço vem do banco em USDT (RN-12, RN-20); cotação para cartão é travada no servidor (RN-36); pagamento só é confirmado por webhook (RN-32).

### Garantia técnica

- `rules.ts`, `queries.ts`, `src/db/*`, `src/lib/env.ts`, `logger.ts` e `cron.ts` começam com `import "server-only"`: **o build quebra** se um componente de cliente importar qualquer um deles.
- ESLint: arquivos em `src/components/**` e `src/features/*/components/**` não importam `rules`, `queries`, `@/db`, `env`, `logger` nem `cron`. Componente recebe o resultado pronto por props, vindo da página (servidor).

### O front só exibe

Regras com lado visual: **o servidor decide e manda o resultado; o front mostra; o servidor confere de novo na ação** (carrinho, checkout, cupom).

| Regra | Servidor decide | Front só mostra | Servidor confere de novo em |
|-------|-----------------|-----------------|-----------------------------|
| RN-11 esgotado | se o produto/slot tem estoque | botão desabilitado, selo "esgotado" | adicionar ao carrinho e criar o checkout |
| RN-13 / RN-19 catálogo | categorias e produtos ativos | lista vinda do banco | carrinho (produto inativo é recusado) |
| RN-18 estimativa em moeda local | valor ≈ com a cotação em cache (`lib/fx`) | texto "≈" já calculado | — (nunca usada para cobrar) |
| RN-21–RN-23 promoção | se está ativa agora e o preço final | preço riscado + contagem até `endsAt` enviado pelo servidor | carrinho e checkout (promoção vencida não vale) |
| RN-26 promoção × cupom | qual desconto é maior | "desconto aplicado: …" | checkout (recalcula) |
| RN-36 cotação do cartão | taxa travada por 15 min | contagem de validade | criação do pagamento (cotação vencida é recusada) |
| RN-82 / RN-83 fuso | valida o cookie `tz` (lista IANA) | detecta o fuso no navegador e formata horários com `Intl` | gravação da preferência |
| RN-90 erro | código estável + `requestId` | mensagem traduzida pelo código | — |
| RN-100–RN-103 busca e filtros | resultado, contagem, ordem e paginação (consulta em `catalog/queries.ts`) | campo, painel de filtros, chips dos filtros ativos | cada requisição (URL validada com zod) |

Validação no formulário (zod no cliente) é só conveniência: o mesmo `schemas.ts` roda de novo no servidor.

## Camadas (regra de dependência — [13 §2](13-padroes-qualidade.md#2-padrões-de-projeto))

```
app/[locale] (rotas, actions, handlers) ──► features/<x> (index.ts) ──► lib (adapters, env)
                                                 │
components (Atomic) ◄────────────────────────────┘   components nunca importam features
```

## Responsabilidades

| Componente | Faz | Não faz |
|------------|-----|---------|
| Página / Server Action / Route Handler | Valida (`schemas.ts`), checa sessão e permissão, chama a feature | Regra de negócio, SQL |
| `features/<x>/rules.ts` | Regras RN puras: preço por região, **preço final com promoção/cupom (`pricing/rules.ts`)**, cálculo de M+, vagas, transições do pedido, conversão de fuso | Banco, rede ou framework |
| `features/<x>/queries.ts` | Leitura e escrita no banco da feature | Decidir regra |
| `lib/payments/crypto` e `lib/payments/card` | Adapters `PaymentProvider` (`createCheckout`, `verifyWebhook`, `refund`) | Mudar estado do pedido |
| `lib/rate-limit` + `lib/valkey` | Rate limit compartilhado por IP no proxy e por rota sensível (docs/09 §2) | Guardar estado em memória do processo |
| `lib/fx` | Busca cotação USDT→USD/EUR/moeda local, com cache | Cobrar |
| `lib/logger` | Log JSON com `requestId` e mascaramento ([16 §3](16-observabilidade.md#3-padrão-de-log)) | Decidir o que é dado pessoal na hora: a lista de chaves proibidas é fixa |
| Provedores de pagamento | Fatura cripto, cartão, 3-D Secure, antifraude | — (a loja nunca vê cartão nem chave de carteira — RN-30) |
| Banco | Fonte da verdade de serviços, preços, slots, pedidos e eventos de webhook | — |

## Features

`catalog` (categorias e produtos), `pricing` (promoções, cupons e cálculo do preço final — RN-21 a RN-29), `schedule` (slots de raid), `cart`, `checkout`, `payments`, `orders`, `admin`, `auth`, `preferences` (região, idioma, fuso), `support` (chat de suporte e reportes de bug), `staff` (contas de suporte/admin, papéis, idiomas e horário de atendimento) — os mesmos nomes dos escopos de commit.

## Idioma, região e fuso (RN-14, RN-80 a RN-83)

| Preferência | Detecção automática | Onde fica | Troca |
|-------------|---------------------|-----------|-------|
| Idioma | `Accept-Language` no middleware do next-intl | Segmento da URL `/[locale]` + cookie `NEXT_LOCALE` | Seletor no cabeçalho |
| Fuso | `Intl.DateTimeFormat().resolvedOptions().timeZone` no navegador | Cookie `tz` (+ perfil, se logado) | Seletor no cabeçalho (lista IANA) |
| Região do jogo | Sugestão pelo fuso na 1ª visita: Europa, África e Atlântico → EU; o resto → US (padrão da RN-14; Oceania e Sudeste Asiático jogam nos servidores US/Oceanic) | Cookie `region` | Seletor no cabeçalho |

- Horários guardados em UTC (`timestamptz`); formatação com `Intl.DateTimeFormat` no fuso escolhido — sem biblioteca de datas.
- Primeira renderização sem cookie `tz`: horários renderizados no cliente (evita mostrar fuso errado vindo do servidor).
- URLs: `/en`, `/fr`, `/de`, `/pt-br`, `/zh-hant`, `/zh-hans`; `hreflang` em todas as páginas.
- Código interno do next-intl **igual ao da URL** (`pt-br`, `zh-hant`, `zh-hans`; arquivos `messages/pt-br.json` etc.). `<html lang>` e `Intl` usam o canônico (`pt-BR`, `zh-Hant`) via `canonicalLocale()`. Não usar prefixo diferente do código: o next-intl reescreve a URL e o Next 16 passa a reescrita pelo proxy de novo → laço de redirecionamento (#59).

## Rede

- Banco e cache sem IP público; só rede privada.
- Portas públicas mínimas; SSH só por chave e IP restrito.

## Fluxos principais

### Compra

1. Cliente escolhe região, produto e opções (realm/facção para gold, slot para raid, chave para M+), e opcionalmente um cupom.
2. O servidor recalcula o total em USDT a partir do banco (RN-20) e aplica o maior desconto entre promoção e cupom (RN-23, RN-26).
3. "Finalizar": escolhe **USDT** ou **cartão** (RN-35). A action cria o pedido `pendente`, reserva gold/vaga (RN-34) e:
   - USDT: cria fatura no gateway (rede escolhida — RN-37), esvazia o carrinho e redireciona para a fatura; falha do gateway → pedido `expirado` e carrinho intacto;
   - Cartão: trava a cotação por 15 min e cria o checkout (RN-36, RN-38).
4. Webhook/IPN assinado → evento gravado em `payment_events` (RN-33) → pedido `pago` (RN-32) ou `pagamento_parcial` (RN-37).
5. Admin atribui o pedido à equipe → `em_andamento` → registra a prova de entrega → `concluido` (RN-52).
6. Pagamento não confirmado em 30 min → cron marca `expirado` e libera a reserva (RN-34).

Sequência em [06](06-uml.md#3-sequência--compra). Pagamentos em [14](14-pagamentos-internacionais.md).

### Chat de suporte (RN-92 a RN-99)

```mermaid
sequenceDiagram
  actor C as Cliente
  participant W as App (qualquer instância)
  participant DB as PostgreSQL
  participant V as Valkey pub/sub
  actor S as Atendente
  C->>W: POST mensagem
  W->>W: valida, mascara cartão/semente (RN-95), rate limit (RN-97)
  W->>DB: grava mensagem
  W->>V: publica "conversa X tem mensagem nova"
  V-->>W: instância que segura o SSE do atendente
  W-->>S: evento SSE com a mensagem
  S->>W: POST resposta
  W->>DB: grava
  W->>V: publica
  alt cliente conectado
    W-->>C: evento SSE
  else cliente fora da página
    W-->>C: e-mail com link assinado (RN-94)
  end
```

- A mensagem é gravada **antes** de ser avisada: se o SSE cair, o cliente busca o que perdeu pelo GET das mensagens (a partir do último `id`).
- Conexões SSE longas exigem que proxy/CDN não cortem a resposta: ping a cada 25 s e `Cache-Control: no-cache`.
- Visitante sem conta: cookie `httpOnly` com token aleatório da conversa (guardado só o hash).

## Modelo de dados (resumo)

- `categories` (id, kind `gold|raid|dungeon`, name, slug, description, image_url, sort_order, active) — RN-13; texto único para todos os idiomas (RN-84)
- `products` (id, category_id, region `US|EU`, name, slug, description, image_url, price_usdt_cents, unit, options jsonb, active, sales_count) — RN-19; índice `pg_trgm` (GIN) em `name` e `description` para a busca (RN-100)
- `promotions` (id, name, type `percent|fixed`, value, scope `store|category|product`, category_id?, product_id?, starts_at, ends_at, active) — RN-21 a RN-24. **Um alvo por registro** (vários alvos = várias promoções; sem tabela `promotion_targets`)
- `coupons` (id, code único (minúsculas), type, value, scope, category_id?, product_id?, starts_at, ends_at, max_uses?, max_uses_per_email?, min_order_usdt_cents, active) — RN-25; um alvo por registro. `carts.coupon_code` guarda o cupom digitado, revalidado a cada leitura
- `coupon_redemptions` (coupon_id, order_id único, email, status `reserved|used|released`) — RN-27: reservado no checkout com a linha do cupom travada, `used` quando o IPN leva a `pago`, `released` na expiração
- `audit_log` (id, admin_id, entity, entity_id, action, before jsonb, after jsonb, created_at) — RN-71
- `raid_slots` (id, product_id, region, starts_at timestamptz, capacity, reserved)
- `carts` (id, created_at, updated_at) + `cart_items` (id, cart_id, product_id, raid_slot_id?, quantity > 0, options jsonb) — carrinho do visitante, id em cookie httpOnly (30 dias); **sem preço gravado**: o total é recalculado a cada leitura (RN-20). Tabela de preço (faixas de M+, multiplicador de loot, passo do gold) em `src/features/pricing/rules.ts` (RN-15 a RN-17)
- `orders` (id, email, locale, status, subtotal_usdt_cents (original), discount_usdt_cents, discount_source `promotion|coupon|none`, discount_ref (id do cupom), total_usdt_cents, payment_method `usdt|card`, network `trc20|erc20`, provider, provider_payment_id, pay_url, paid_usdt_cents, tx_hash, expires_at, created_at, updated_at). Com o cartão (#26) entram quote_rate, charged_amount, charged_currency
- `order_items` (order_id, product_id, raid_slot_id?, product_name (cópia), options jsonb — realm, facção e personagem do gold, loot da raid, nível e timed do M+ —, unit_price_usdt_cents (original), discount_usdt_cents (promoção da linha), promotion_id?, quantity). Preços e descontos congelados no checkout (RN-29)
- `deliveries` (order_id, proof_url, note, delivered_at, admin_id) — RN-52
- `payment_events` (provider, provider_event_id **único** = `payment_id:status:valor pago`, order_id, type, payment_id, pay_currency, paid_usdt_cents, tx_hash, received_at) — idempotência (RN-33) e conciliação; IPN que não bate com o pedido (rede/valor) fica registrado e sem efeito
- `users`, `sessions`, `accounts` (hash scrypt da senha), `verifications`, `two_factors` (segredo TOTP criptografado) — Better Auth, só equipe no MVP (cliente compra sem conta — RN-01). Sem rota `/api/auth`: login e 2FA rodam em Server Actions via `auth.api`; telemetria do Better Auth desligada
- `access_logs` (occurred_at, ip, port?, user_id?, session_id?, method, route, request_id) — log de acesso legal, 6 meses ([16 §9](16-observabilidade.md#9-log-de-acesso-obrigação-legal))
- `staff_profiles` (user_id, role `suporte|admin`, languages text[], active, invited_by, created_at) — RN-04 a RN-06; clientes não têm linha aqui
- `support_hours` (weekday, starts_at_utc, ends_at_utc) — RN-99
- `support_conversations` (id, user_id?, guest_email?, guest_name?, order_id?, locale, status `aberta|em_atendimento|resolvida`, assigned_to?, guest_token_hash?, created_at, last_message_at, resolved_at) — RN-92, RN-93
- `support_messages` (id, conversation_id, author_type `customer|staff|system`, author_id?, body, created_at, read_at) — corpo já mascarado (RN-95)
- `support_attachments` (id, message_id, storage_key, mime, size_bytes) — RN-96
- `bug_reports` (id, description, email?, page, request_id, locale, region, timezone, user_agent, release, status, created_at) — RN-91

## Rotas

| Rota | Tipo | Acesso |
|------|------|--------|
| `/[locale]` | Página | Público |
| `/[locale]/produtos?q=&cat=&region=&min=&max=&disponivel=1&sort=&page=` | Página (busca e filtros — RN-100 a RN-103). Fora de `/wow/` para não colidir com o slug de uma categoria; `promo=1` e ordenação pelo preço final entram com #74 | Público |
| `/[locale]/wow/[categoria]`, `/[locale]/wow/[categoria]/[produto]` (slugs criados pelo admin — RN-13, RN-19; rotas no grupo `app/[locale]/(store)`). Inexistente → página "não encontrada" com `noindex` (status 200 por causa do streaming) | Página | Público |
| `/[locale]/carrinho` (carrinho e checkout na mesma página: e-mail, rede e "Pagar com USDT") | Página + Server Actions | Público (visitante — RN-01) |
| `/[locale]/pedido/[id]?t=` | Página | Dono do pedido: link assinado (HMAC do id com `ORDER_LINK_SECRET`); token errado = "não encontrado". Não mostra o e-mail |
| `/[locale]/admin/entrar`, `/[locale]/admin/entrar/codigo`, `/[locale]/admin/2fa` | Página + Server Actions | Login da equipe (senha → código TOTP); primeiro acesso ativa o 2FA. Conta inicial: `pnpm admin:create <email>` |
| `/[locale]/admin/*` | Página | Equipe ativa com 2FA (RN-02); permissão conferida em cada página e action (`requireStaff`), não no layout |
| `/[locale]/admin/categorias`, `/[locale]/admin/produtos`, `/[locale]/admin/promocoes`, `/[locale]/admin/cupons` | Página + Server Actions | Admin com 2FA (RN-70) |
| `/api/webhooks/crypto`, `/api/webhooks/card` | API | Só assinatura do provedor |
| `/api/cron/expire-orders`, `/api/cron/refresh-fx`, `/api/cron/purge-access-logs` | API | Segredo do cron |
| `/api/health` | API | Público; só status (sem versão de dependências nem dados) — usado pelo Better Stack Uptime |
| `/api/bug-reports` | API | Público, com rate limit e CAPTCHA (RN-91) |
| `/api/support/conversations` | API (POST) | Público, CAPTCHA para visitante, rate limit (RN-92, RN-97) |
| `/api/support/conversations/[id]/messages` | API (GET/POST) | Dono da conversa (sessão ou cookie da conversa) ou equipe |
| `/api/support/conversations/[id]/stream` | API (SSE) | Idem; ping a cada 25 s |
| `/api/support/stream` | API (SSE) | Equipe — avisos da fila |
| `/[locale]/admin/suporte` | Página | Suporte e admin com 2FA (fila, conversa, dados do pedido) |
| `/[locale]/admin/equipe` | Página | Só admin (convidar, desativar, papéis, idiomas, horário) |
| `/[locale]/admin/docs`, `/[locale]/admin/docs/[slug]` | Página | Admin e suporte com 2FA (RN-74); lê `docs/*.md` no build — sem cópia |
| `/[locale]/admin/bug-reports` | Página | Admin com 2FA |
