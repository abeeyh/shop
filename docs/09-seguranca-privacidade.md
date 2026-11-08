# 09 — Segurança e privacidade

Base de segurança válida para qualquer app web. Complete as seções marcadas com o que for específico do projeto.

## 1. Modelo de ameaças

### Fronteiras de confiança (tudo que entra é hostil)

| Fronteira | Entrada não confiável |
|-----------|----------------------|
| Navegador → API | Formulários, parâmetros de rota, cookies |
| Links de e-mail → API | Tokens de verificação e recuperação |
| Provedores OAuth → Auth | Callback (`state`, `code`) |
| Webhooks externos → API | Eventos de pagamento e serviços |
| Cron → API | Chamadas a `/api/cron/*` |
| Gateway cripto → API | IPN de pagamento (HMAC) |
| API de cotação → App | Taxa USDT→moeda (pode vir errada ou manipulada) |
| Seletores de idioma/fuso/região | Cookies `NEXT_LOCALE`, `tz`, `region` |
| Chat de suporte → API | Mensagens, anexos, cookie da conversa do visitante, conexão SSE |
| Convite de equipe → Auth | Link de convite de suporte/admin |

### Ativos

Contas, senhas (hash), e-mails, pedidos e pagamentos (USDT e cartão), dados de personagem (nome, realm), saldo nos provedores, reputação do domínio.

### STRIDE

| Ameaça | Exemplo no projeto | Controle |
|--------|--------------------|----------|
| Falsificação | [ ] | Sessão do servidor; webhooks com assinatura |
| Adulteração | [ ] | Valores sensíveis (plano, papel, limites) vêm do banco, nunca do cliente; consultas parametrizadas; `zod` |
| Repúdio | [ ] | Log de auditoria de ações sensíveis |
| Vazamento | [ ] | Respostas que não revelam se um e-mail existe; erros genéricos |
| Negação de serviço | [ ] | Rate limit em store compartilhado; CAPTCHA no cadastro; CDN/WAF |
| Elevação de privilégio | [ ] | Autorização sobre o recurso em toda rota; 2FA opcional para a equipe (#116 — risco aceito abaixo) |

### Casos de abuso que viram testes

1. Rota protegida sem sessão → 401.
2. Usuário acessa recurso de outro usuário → 404.
3. Força bruta no login → bloqueio após N tentativas.
4. Token de e-mail reutilizado ou vencido → recusado.
5. Webhook sem assinatura ou repetido → ignorado.
6. Cron sem segredo → 401.
7. Cliente altera preço/quantidade no request do checkout → total recalculado do banco (RN-20).
8. Webhook de pagamento forjado → assinatura inválida, ignorado (RN-32).
9. IPN cripto com valor menor que o pedido → `pagamento_parcial`, sem entrega (RN-37).
10. Checkout de cartão com cotação vencida (> 15 min) → recusado, pede nova cotação (RN-36).
11. Cookie `tz` ou `region` inválido → valor padrão; nunca usado sem validação (lista IANA / enum).
12. Locale fora dos 6 na URL → 404 ou redireciona para `en` (RN-81).
13a. Cupom: força bruta de códigos → bloqueio após 10 tentativas/hora (RN-28); uso simultâneo além do limite → só os primeiros reservam (RN-27, transação); cupom ou desconto enviado pelo cliente → ignorado, recalculado no servidor (RN-20).
13b. Suporte tentando alterar preço, promoção ou cupom → 403 (RN-06); toda alteração auditada (RN-71). *(Antes do #116 também valia para admin sem 2FA; hoje o 2FA é opcional.)*
13c. Mensagem de chat com `<script>` → exibida como texto, nunca HTML.
13d. Visitante tenta ler conversa de outro (trocando o `id`) → 404 (RN-92).
13e. Atendente de suporte tenta mudar preço, cupom, reembolso ou equipe → 403 (RN-06).
13f. Mensagem com número de cartão ou frase-semente → gravada mascarada (RN-95).
13g. Anexo que não é imagem, maior que 5 MB ou com extensão falsa → recusado pelo conteúdo, não pela extensão (RN-96).
13h. Link de convite de equipe reutilizado ou vencido → recusado.
13. Spam no "Reportar problema" → bloqueado após 5/hora por IP (RN-91).
14. Erro forçado em produção → resposta sem stack trace, com código e ID (RN-90); log sem dados pessoais.

## 2. Controles

### Autenticação e sessão
- Senhas com scrypt/argon2; nunca em log.
- Regra de senha (#107, decisão do dono em 2026-11-07): **8+ caracteres com maiúscula, minúscula e número**, para cliente e equipe (`src/lib/password.ts`, conferida no servidor; o `pattern` do navegador só ajuda). Antes: 12+. A equipe pode ativar 2FA (opcional desde o #116 — RN-02).
- Verificação de e-mail; tokens de uso único com validade curta.
- Vínculo de contas OAuth ↔ senha só com e-mails verificados.
- Senhas vazadas recusadas (HIBP por k-anonimato: só 5 caracteres do SHA-1 saem) no aceite do convite e no cadastro de cliente (RN-107); HIBP fora do ar não bloqueia (log `auth.hibp_unavailable`). A conta inicial (`pnpm admin:create`) usa senha gerada.
- Rate limit em store compartilhado (não em memória): Valkey, janela fixa atômica (`src/lib/rate-limit.ts`, limites em `RATE_LIMITS`):

  | Onde | Limite | Se o Valkey cair |
  |------|--------|------------------|
  | Toda página/API, por IP, no proxy (antes do log de acesso) | 300/min | passa (disponibilidade) + alerta `rate_limit.unavailable` 1×/min |
  | Busca (RN-105) | 30/min | passa |
  | Login (equipe **e** cliente no mesmo balde por IP): senha por IP e por e-mail; excluir conta também por conta; código do 2FA por IP (o Better Auth ainda limita a 5 tentativas por desafio e bloqueia a conta por 15 min após 10 falhas) | 10 a cada 10 min | **bloqueia** (`failClosed`) |

  Risco aceito: o limite de cupom "por cliente" (RN-25) conta o e-mail normalizado (sem `+tag`, sem pontos no Gmail), mas sem conta nem verificação de e-mail é só uma barreira leve.
  Pendente antes de produção: CAPTCHA no chat e no reporte (Turnstile, #29) — sem ele, e-mail não verificado permite abrir muitas conversas (o limite por IP segura parte). Expurgo de conversas 1 ano depois de resolvidas (cron).
  Risco aceito (#101): conta de cliente sem e-mail verificado e sem CAPTCHA no cadastro até o #29 — mitigado por 5 cadastros/h por IP (`failClosed`), senha vazada recusada, conta que só vê pedidos feitos logada e cadastro que já entra logado. **Desde o #118 o cadastro avisa quando o e-mail já tem conta** (decisão do dono): dá para descobrir se um e-mail é cliente ou da equipe, limitado a 5 tentativas/h por IP. "Esqueci a senha" bloqueado até ter e-mail transacional. Conta de cliente não verificada não ocupa e-mail de equipe: o convite pode ser feito e o aceite apaga essa conta (nunca a promove — RN-04). Excluir conta limita tentativas de senha por IP **e** por conta. Logger do Better Auth fixo em `warn` (em `info` ele grava e-mail de cadastro repetido).
  Risco aceito (#116, decisão do dono em 2026-11-07): **2FA da equipe opcional**. Sem ele, uma senha vazada ou adivinhada dá acesso ao painel (preços, cupons, pedidos, equipe). Mitigado por: senha 8+ com maiúscula, minúscula e número e recusa de senha vazada (HIBP), limite de tentativas por IP e por e-mail, sessão da equipe com teto de 12 h, auditoria de toda alteração (RN-71) e 2FA disponível para quem quiser (recomendado, principalmente para admin).
  Risco aceito: pedido em `pagamento_parcial` não expira e segura vaga e uso de cupom até o admin resolver (fluxo do admin em #23).
  Risco aceito: quem sabe o e-mail de um admin consegue travar o login dele por 10 min de cada vez (limite por e-mail). Monitorar `auth.login_failed`; se virar problema, contar só falhas no balde por e-mail.
  | Cupom (RN-28), por IP | 10/hora | **bloqueia** (`failClosed`) |
  | Sugestões da busca (#110), por IP | 120/min | deixa passar (`failClosed: false` — só leitura do catálogo público) |
  | Cadastro de cliente (RN-107), por IP | 5/hora | **bloqueia** (`failClosed`) |
  | Checkout (cada um reserva vaga e cupom), por IP | 10 a cada 10 min | **bloqueia** (`failClosed`) |
  | Reporte, chat (quando existirem) | definir na issue | **bloqueia** (`failClosed`) |

  Chave: IPv4 por endereço; **IPv6 pelo prefixo /64** (um cliente costuma ter o /64 inteiro e trocaria de endereço para fugir do limite). Sem IP válido → balde único `ip:unknown` (em production gera alerta `rate_limit.unknown_ip`: indica CDN mal configurada).
  Valkey lento ou travado: timeout de 150 ms e **disjuntor** de 5 s — após uma falha, as requisições seguintes nem consultam o Valkey (verificado com o container congelado: latência normal).
  Rotas com ponto no caminho (ex.: `/api/x.json`) passam pelo proxy; só arquivos estáticos conhecidos ficam fora.
  Bloqueado → 429 com `Retry-After` e `{ error: { code: "rate_limited", requestId } }`. `/api/health` fica fora. `VALKEY_URL` é obrigatório em production.
- Cookie `httpOnly`, `Secure`, `SameSite=Lax`; trocar senha encerra outras sessões. Exceção consciente: o cookie `theme` (RN-111) não é `httpOnly` porque o script do `<head>` o lê antes da pintura — não é dado sensível e valor fora da lista é ignorado.
- CSRF: origens confiáveis configuradas.

### Autorização
- Toda rota checa sessão **e** permissão sobre o recurso.

### Entrada e saída
- `zod` em toda entrada; tamanho máximo de corpo.
- React escapa por padrão; proibido `dangerouslySetInnerHTML` com dado de usuário.
- Servidor nunca busca URL enviada por usuário (SSRF).
- Upload (se houver): URL assinada, chave gerada pelo servidor, antivírus, download como anexo em outro domínio.
- Imagens do serviço (#136): só caminhos de `public/catalog/` (sem URL externa, `//host` ou `..`) — validado em `features/catalog/content.ts`; o upload pelo dashboard (#137) segue a regra acima.

### Headers
- CSP com nonce + `strict-dynamic`, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` mínima.
- Sem CORS aberto.

### Webhooks e cron
- Assinatura verificada + tabela de idempotência.
- Cron com segredo e só pela rede interna.

### Servidores
- Firewall mínimo; banco e cache sem IP público.
- SSH só por chave, sem root, IP restrito.
- Atualizações automáticas; containers sem root.
- Backups criptografados em armazenamento privado.

### Segredos e dependências
- Segredos fora do repositório; `.env.example` com placeholders.
- `pnpm install --frozen-lockfile`, scripts de instalação só de pacotes aprovados, `pnpm audit` antes de release, Dependabot.

### Logs e rastreamento de erros
- Nunca registrar senha, token, cookie, dados de cartão, chave de carteira ou dados pessoais completos; `redact` do pino e `beforeSend` do Sentry ([16 §3–4](16-observabilidade.md#3-padrão-de-log)).
- Sentry com `sendDefaultPii: false` e Session Replay desligado ou totalmente mascarado.
- Source maps só no Sentry, nunca públicos.
- Acesso ao Better Stack e ao Sentry só com 2FA; tokens de ingestão por ambiente, em segredo.
- `access_logs` sem tela no admin; consulta só por ordem judicial, registrada em auditoria; IP lido só do header confiável da CDN.

### Pagamentos
- Checkout hospedado pelo provedor; pedido/plano só muda por webhook (RN-32).
- A loja nunca recebe, loga ou guarda número de cartão, CVV ou validade (mantém o escopo PCI em SAQ-A).
- Valor cobrado sempre recalculado no servidor (RN-20); 3-D Secure ligado; antifraude do provedor ativo.

## 3. Nunca (não negociável sem aprovação explícita)

- Confiar no cliente para plano, limite, papel ou identidade.
- Guardar senha sem hash, ou segredo no código/repositório.
- Revelar se um e-mail está cadastrado — **exceto** o aviso do cadastro de cliente ("este e-mail já tem conta", #118, risco aceito abaixo). Login, reset e chat continuam sem revelar.
- Exibir stack trace ao usuário.
- Buscar no servidor uma URL enviada por usuário.
- Receber ou guardar dados de cartão no servidor da loja.
- Aceitar preço, total ou cotação enviados pelo cliente.
- Pedir, receber ou guardar login/senha de Battle.net do cliente (RN-03).
- Guardar chave privada ou seed de carteira cripto no servidor da app.
- Atendente pedir senha, código 2FA ou dados de cartão ao cliente pelo chat.
- Criar conta de suporte/admin pelo cadastro público.

  Pendente (análise de 2026-11-07, #113): "exportar meus dados" na conta do cliente (LGPD art. 18) — hoje só há excluir (RN-109); até lá, o suporte exporta a pedido.

## 4. LGPD

| Dado | Finalidade | Base legal | Retenção |
|------|-----------|------------|----------|
| E-mail, hash da senha | Conta e login | Execução de contrato | Até excluir a conta + 30 dias |
| Personagens salvos na conta (realm, facção, nome — RN-108) | Preencher compras futuras | Consentimento (o cliente escolhe salvar) | Até o cliente remover ou excluir a conta (RN-109) |
| IP e logs de acesso (tabela `access_logs`) | Segurança, Marco Civil (art. 15) | Obrigação legal | 6 meses, apagado por cron diário |
| Logs de depuração (Better Stack) | Correção de erros | Legítimo interesse | 3 dias |
| Cookies de anúncio/analytics | [ ] | Consentimento | Conforme CMP |
| Nome do personagem, realm, facção | Entrega do serviço | Execução de contrato | 5 anos (fiscal) |
| Hash da transação USDT, cotação, valor cobrado | Conciliação e fiscal | Obrigação legal | 5 anos |
| Reporte de bug (descrição, e-mail opcional, navegador) | Suporte e correção | Legítimo interesse | 1 ano |
| Conversas e anexos do chat de suporte | Atendimento ao cliente | Execução de contrato / legítimo interesse | 1 ano após resolvida; anexos apagados junto |
| Contas de equipe (nome, e-mail, idiomas, ações auditadas) | Operação e auditoria | Execução de contrato | Enquanto ativa + 5 anos da auditoria |
| Idioma, fuso, região e tema (cookies; tema também na conta — RN-111) | Funcionamento do site | Legítimo interesse (cookie funcional, sem consentimento) | 1 ano |

- Operadores com acordo de tratamento de dados: Better Stack (logs, Europa/DE), Sentry (erros), gateway cripto, provedor de cartão, e-mail transacional, hospedagem. [confirmar DPA de cada um]
- Excluir conta apaga os dados pessoais; mantém só o exigido por lei.
- Exportar dados pelo perfil.
- Encarregado (DPO): [e-mail].
- Termos e Privacidade revisados por advogado antes do lançamento.
