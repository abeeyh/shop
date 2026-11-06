# 03 — Stack

Princípio: o menor número de peças que resolve o problema. A tabela abaixo é o **padrão sugerido** para apps web; troque o que não servir e registre o motivo.

## Aplicação

| Camada | Escolha padrão | Por quê |
|--------|----------------|---------|
| Linguagem | **TypeScript** | Um idioma no front e no back |
| Framework web | **Next.js 16 (App Router)**, `output: "standalone"` em Node.js, Turbopack, `cacheComponents` | Páginas, API e Server Actions no mesmo projeto; roda em qualquer container. Usa `src/proxy.ts` (antigo middleware) |
| UI | **Tailwind CSS + shadcn/ui** + lucide-react | Componentes acessíveis, sem lib pesada |
| Idiomas | **next-intl** — `en` (padrão), `fr`, `de`, `pt-BR`, `zh-Hant`, `zh-Hans` | Feito para o App Router; detecção por `Accept-Language` (RN-80, RN-81) |
| Fuso horário | **API `Intl` nativa** (sem biblioteca) | Detecta e formata fuso IANA (RN-82, RN-83) |
| Autenticação | **Better Auth** | Dados no próprio banco, e-mail+senha com verificação, OAuth, 2FA |
| Banco | **PostgreSQL** | Relacional, padrão de mercado |
| ORM | **Drizzle ORM** | Tipado, migrações SQL simples |
| Cache / rate limit | **Valkey** (ou Redis) | Rate limit compartilhado entre instâncias; **pub/sub do chat** entre instâncias |
| Chat em tempo real | **SSE** (Route Handler com `ReadableStream`) + PostgreSQL + pub/sub do Valkey — sem serviço novo | Mensagem gravada no banco, aviso via Valkey, entregue por SSE (RN-92 a RN-99) |
| Validação | **zod** | Em toda fronteira de entrada |
| Testes | **Vitest** + Testing Library + **Playwright** | Unitário, integração, E2E |
| Pacotes | **pnpm** (versão fixada) | Rápido, lockfile determinístico |
| Qualidade | ESLint (boundaries, import, jsx-a11y), Prettier, Husky, lint-staged, commitlint | Ver [13](13-padroes-qualidade.md) |
| Versões | **release-please** | SemVer e CHANGELOG automáticos |

## Infraestrutura

| Necessidade | Escolha | Uso |
|-------------|---------|-----|
| Hospedagem da aplicação | [provedor / produto] | |
| Banco gerenciado | [provedor / produto] | |
| Armazenamento de arquivos | [S3 compatível] | |
| Registro de imagens | [registry] | |
| DNS / CDN / DDoS | [ex.: Cloudflare] | |
| Pagamento cripto | **NOWPayments** (USDT TRC-20/ERC-20) *(proposta — confirmar aceitação do setor)* | Fatura hospedada + IPN assinado — ver [14](14-pagamentos-internacionais.md) |
| Pagamento cartão | On-ramp do gateway cripto ou processador *high-risk* *(a decidir)* | Stripe/PayPal proíbem o setor — ver [14 §1](14-pagamentos-internacionais.md#1-restrição-principal-provedores-comuns-não-aceitam-este-negócio) |
| Cotação USDT | API pública de preço ou a do provedor *(a decidir)* | Estimativa na vitrine e trava de 15 min no cartão (RN-18, RN-36) |
| E-mail transacional | [ex.: Resend] | |
| Erros | **Sentry** *(proposta — confirmar)*; alternativa auto-hospedada GlitchTip | Ver [16](16-observabilidade.md) |
| Logs | **pino** (JSON) → **Better Stack Logs** (transport oficial `@logtail/pino`) | **Plano gratuito** em todos os ambientes (3 dias, para depurar); log de acesso legal de 6 meses no PostgreSQL — [16 §8–9](16-observabilidade.md) |
| Uptime | **Better Stack Uptime** | Monitor externo do site e da rota de saúde, página de status |
| Infra como código | **Terraform** | Toda a infra versionada em `infra/` |

## Existe um serviço de backend?

[Descrever: backend dentro do Next.js (Route Handlers/Server Actions) ou serviço separado, e quando separar.]

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Stripe, PayPal | Proíbem venda de moeda/itens de jogo por terceiros; risco de saldo retido |
| jQuery + Slick (do template de referência) | Fora da stack; carrossel com CSS scroll-snap |
| Crisp, Tawk.to, Chatwoot (chat) | Escolhido chat próprio em 2026-11-06: dados com a loja, visual e 6 idiomas sob controle, custo R$ 0; SaaS pode recusar o setor |
| WebSocket | SSE basta (servidor → cliente); cliente envia por POST. Menos peças e funciona atrás de qualquer proxy HTTP |
| Axiom, Grafana Loki (logs) | Better Stack escolhido em 2026-11-06: logs + uptime no mesmo serviço, sem servidor próprio |
| Biblioteca de datas (date-fns-tz, Luxon) | `Intl` nativo resolve detecção e formatação de fuso |
