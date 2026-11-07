# 02 — Regras de negócio

Fonte da verdade do comportamento do produto. Cada regra tem um ID (`RN-xx`) citado em código, testes e PRs.

## Como escrever

- Uma regra por linha, verificável (dá para escrever um teste).
- IDs **estáveis**: nunca renumerar. Regra removida fica com *(revogada em AAAA-MM-DD)*.
- Faixas de IDs: conta 01–09, catálogo 10–19, carrinho/descontos/cupons 20–29, checkout/pagamento 30–49, pedidos 50–69, admin 70–79, idioma/fuso 80–89, suporte/erros 90–99, busca e filtros 100–109.
- Valores que podem mudar (limites, prazos, preços) ficam aqui e no objeto de configuração do código — nunca espalhados.
- Proposta ainda não aprovada: marque *(proposta — confirmar)*.

## Conta

| ID | Regra |
|----|-------|
| RN-01 | Comprar não exige conta: checkout como visitante com e-mail. *(proposta — confirmar)* |
| RN-02 | Admin acessa o painel só com 2FA ativo. *(proposta — confirmar)* |
| RN-03 | A loja **nunca** pede, recebe ou guarda login/senha de Battle.net do cliente. No MVP todo serviço é *self-play* (o cliente joga junto). *(proposta — confirmar)* |
| RN-04 | Papéis: `cliente`, `suporte` e `admin`. Contas de **suporte** e **admin** só são criadas por um admin, por convite de e-mail; nunca pelo cadastro público. *(aprovada em 2026-11-06)* |
| RN-05 | Suporte e admin exigem 2FA (amplia RN-02). Conta de equipe desativada perde o acesso e todas as sessões na hora. *(proposta — confirmar)* |
| RN-06 | **Suporte pode:** atender o chat, ver pedidos (status, itens, personagem/realm, histórico — sem cotação, valor cobrado em cartão nem hash completo da transação), mudar pedido `pago → em_andamento → concluido` com prova de entrega (RN-52) tratar reportes de bug (RN-91) e ler a documentação interna (RN-74). **Não pode:** categorias, produtos, preços, promoções, cupons, reembolsos nem contas de equipe. Admin pode tudo. *(aprovada em 2026-11-06)* |
| RN-07 | Toda ação de suporte ou admin em pedido, conversa ou reporte entra na auditoria (como RN-71). *(proposta — confirmar)* |

## Catálogo

| ID | Regra |
|----|-------|
| RN-10 | ~~Preço em centavos de BRL.~~ *(revogada em 2026-11-06 — substituída por RN-12)* |
| RN-11 | Serviço indisponível (sem estoque de gold ou sem vaga na raid) não pode ir ao carrinho. *(proposta — confirmar)* |
| RN-12 | Todo preço é definido em **USDT**, guardado como inteiro em centésimos de USDT (`price_usdt_cents`); nunca `float`. *(aprovada em 2026-11-06)* |
| RN-13 | **Categorias são criadas, editadas, ordenadas e desativadas pelo admin** (nome, slug, imagem, ordem, ativa). Nome e descrição são **os mesmos em todos os idiomas** (RN-84). Cada categoria tem um **tipo** fixo — `gold`, `raid` ou `dungeon` — que define os campos do pedido (RN-15 a RN-17). O negócio continua só de World of Warcraft. *(alterada em 2026-11-06; tipo por categoria: proposta — confirmar)* |
| RN-14 | Região do jogo: **US** ou **EU** (Retail). O visitante escolhe a região; preço, disponibilidade e horários podem variar por região. *(aprovada em 2026-11-06)* |
| RN-15 | Gold: preço por unidade de 1.000 gold, definido por região (e opcionalmente por realm/facção); pedido exige realm, facção e nome do personagem. *(proposta — confirmar)* |
| RN-16 | Raid: tem raid, dificuldade (Normal/Heroic/Mythic), opção de loot e um **horário (slot)**; o slot tem vagas limitadas. *(proposta — confirmar)* |
| RN-17 | Dungeon: nível da chave Mythic+, quantidade de runs e opção "timed"; preço calculado por tabela de configuração. *(proposta — confirmar)* |
| RN-19 | **Produtos são criados pelo admin dentro de uma categoria**: nome, descrição, imagem, região (US/EU), preço-base em USDT (RN-12), opções do tipo da categoria e ativo. Textos iguais em todos os idiomas (RN-84). Produto desativado sai da vitrine, mas continua visível nos pedidos antigos. *(aprovada em 2026-11-06)* |
| RN-18 | Preço em outra moeda (EUR, BRL, TWD, CNY…) é só **estimativa** exibida com "≈"; a cobrança é sempre pelo valor em USDT (RN-35). *(proposta — confirmar)* |

## Busca e filtros

| ID | Regra |
|----|-------|
| RN-100 | Campo de **busca por produto** no cabeçalho de todas as páginas da loja. Busca em nome e descrição de produtos e categorias ativos (texto único, RN-84), tolerante a erro de digitação; mínimo de 2 caracteres. *(aprovada em 2026-11-06)* |
| RN-101 | **Página de produtos com filtros**: categoria, região (US/EU), faixa de preço em USDT, "em promoção" (com as promoções — #21) e "só disponíveis" (com estoque ou vaga — RN-11). *(aprovada em 2026-11-06; lista de filtros: proposta — confirmar)* |
| RN-102 | Ordenação: relevância (com busca), mais vendidos (padrão sem busca), menor preço e maior preço — preço sempre o **final**, já com promoção ativa (RN-21). *(proposta — confirmar)* |
| RN-103 | Busca, filtros, ordenação e página ficam na URL (link compartilhável) e são **aplicados no servidor**; valor inválido na URL é ignorado (volta ao padrão). 24 produtos por página. *(proposta — confirmar)* |
| RN-104 | Sem resultado: mensagem no idioma do usuário, botão "limpar filtros" e sugestão das categorias; produto inativo nunca aparece. *(proposta — confirmar)* |
| RN-105 | Busca com rate limit compartilhado (#48): 30 buscas por minuto por IP. *(proposta — confirmar)* |

## Carrinho

| ID | Regra |
|----|-------|
| RN-20 | O preço e o total são sempre recalculados no servidor a partir do banco; valor vindo do cliente é ignorado. *(proposta — confirmar)* |

### Desconto por tempo (promoção)

| ID | Regra |
|----|-------|
| RN-21 | O admin cria promoções com **percentual** (1–90%) ou **valor fixo em USDT**, para produtos, categorias ou a loja toda, com **início e fim** (guardados em UTC, exibidos no fuso de quem vê — RN-83). *(aprovada em 2026-11-06; limites: proposta — confirmar)* |
| RN-22 | A promoção só vale dentro da janela `[início, fim)`. Durante ela, a vitrine mostra preço original riscado, preço promocional e contagem até o fim. *(proposta — confirmar)* |
| RN-23 | Promoções não acumulam entre si: se mais de uma vale para o produto, aplica a de **maior desconto**. *(proposta — confirmar)* |
| RN-24 | Desconto calculado em centavos de USDT, arredondado para o centavo mais próximo; preço final nunca menor que 1 centavo. *(proposta — confirmar)* |

### Cupom

| ID | Regra |
|----|-------|
| RN-25 | O admin cria cupons com: código único (sem diferenciar maiúsculas), percentual ou valor fixo em USDT, início e fim, limite total de usos, limite por cliente (e-mail), valor mínimo do pedido, escopo (produtos, categorias ou loja toda) e ativo. *(aprovada em 2026-11-06; campos: proposta — confirmar)* |
| RN-26 | **Cupom e promoção por tempo não acumulam: vale o maior desconto** para o pedido. O carrinho mostra qual foi aplicado e por quê. *(aprovada em 2026-11-06)* |
| RN-27 | Cupom é validado e calculado **só no servidor**. O uso é reservado ao criar o checkout e liberado se o pedido expirar (como RN-34); conta como usado quando o pedido vira `pago`. *(proposta — confirmar)* |
| RN-28 | Tentativas de cupom inválido limitadas a 10 por hora por IP/sessão; a mensagem é genérica ("cupom inválido ou expirado"). *(proposta — confirmar)* |
| RN-29 | O pedido guarda preço original, desconto, origem do desconto (promoção ou cupom) e preço final; mudar preço, promoção ou cupom depois **não altera** pedidos existentes. *(proposta — confirmar)* |

## Checkout e pagamento

| ID | Regra |
|----|-------|
| RN-30 | Pagamento só por checkout/fatura hospedada do provedor; a loja nunca recebe nem guarda dados de cartão ou chaves de carteira. *(proposta — confirmar)* |
| RN-31 | ~~Moeda de cobrança BRL.~~ *(revogada em 2026-11-06 — substituída por RN-35)* |
| RN-32 | Pedido só muda para **pago** por webhook/IPN assinado do provedor; retorno do navegador não confirma pagamento. *(proposta — confirmar)* |
| RN-33 | Webhook repetido não gera efeito duplicado (idempotência pelo ID do evento). *(proposta — confirmar)* |
| RN-34 | Vaga de raid e gold são reservados ao criar o checkout e liberados se o pagamento não for confirmado em 30 min. No MVP o gold não tem estoque cadastrado, então só a vaga de raid é reservada; pedido `pagamento_parcial` mantém a vaga até o admin resolver. *(proposta — confirmar)* |
| RN-35 | Meios de pagamento: **USDT** (cripto, via gateway) e **cartão**. O valor-base é sempre o preço em USDT. *(aprovada em 2026-11-06)* |
| RN-36 | Cartão: valor cobrado = preço final em USDT (já com desconto) × cotação USDT→moeda do cartão, **travada no início do checkout** por 15 min; a cotação e o valor cobrado ficam gravados no pedido. *(proposta — confirmar)* |
| RN-37 | USDT: redes aceitas TRC-20 e ERC-20 *(proposta — confirmar)*; pagamento a menor deixa o pedido `pagamento_parcial` (sem entrega); a maior gera crédito ou devolução manual pelo admin. *(proposta — confirmar)* |
| RN-38 | Cartão sempre com 3-D Secure. *(proposta — confirmar)* |

## Pedidos

| ID | Regra |
|----|-------|
| RN-50 | Estados do pedido: `pendente → pago → em_andamento → concluido`; `pendente → expirado`; `pendente → pagamento_parcial → pago`; `pago/em_andamento → reembolsado`; `pago/em_andamento/concluido → contestado` (RN-51). Diagrama em [06 §4](06-uml.md#4-estados--pedido-rn-50-rn-51). *(alterada em 2026-11-06; proposta — confirmar)* |
| RN-51 | Chargeback/contestação marca o pedido como `contestado` e notifica o admin. *(proposta — confirmar)* |
| RN-52 | Pedido só vira `concluido` com **prova de entrega** registrada pelo admin (ex.: print do envio de gold, log da raid/run). *(proposta — confirmar)* |

## Admin (dashboard)

| ID | Regra |
|----|-------|
| RN-70 | O dashboard (2FA — RN-02, RN-05; permissões por papel — RN-06) gerencia: **categorias, produtos, preços, promoções por tempo, cupons**, slots de raid, pedidos, **equipe (contas de suporte/admin)**, **chat de suporte**, horário de atendimento e **documentação interna** (RN-74). *(aprovada em 2026-11-06)* |
| RN-74 | **Documentação interna** em `/[locale]/admin/docs`: mostra os arquivos de `docs/` do repositório (fonte única, sem cópia), só para **admin e suporte** (RN-04 a RN-06); cliente e visitante recebem 404. *(aprovada em 2026-11-06)* |
| RN-71 | Toda criação/alteração de categoria, produto, preço, promoção ou cupom gera registro de auditoria: quem, quando, valor antes e depois. *(proposta — confirmar)* |
| RN-72 | Categoria, produto ou cupom já usado em pedido não é apagado, só desativado. *(proposta — confirmar)* |
| RN-73 | Categoria com produtos ativos não pode ser desativada sem antes desativar ou mover os produtos. *(proposta — confirmar)* |

## Idioma e fuso horário

| ID | Regra |
|----|-------|
| RN-80 | Idiomas: `en` (padrão), `fr`, `de`, `pt-BR`, `zh-Hant` (tradicional), `zh-Hans` (simplificado). *(aprovada em 2026-11-06)* |
| RN-81 | Primeiro acesso: idioma detectado pelo navegador (`Accept-Language`); se não for um dos 6, usa `en`. A escolha manual fica salva e tem prioridade. *(aprovada em 2026-11-06)* |
| RN-82 | Fuso horário detectado automaticamente pelo navegador (IANA, ex.: `America/Sao_Paulo`) e **alterável** pelo usuário; a escolha fica salva (cookie e, se logado, perfil). *(aprovada em 2026-11-06)* |
| RN-84 | Conteúdo do catálogo cadastrado pelo admin (nome e descrição de categorias e produtos) é **o mesmo em todos os idiomas**; só os textos fixos da interface são traduzidos (RN-80). *(aprovada em 2026-11-06)* |
| RN-83 | Todo horário é guardado em **UTC**; exibido no fuso escolhido (RN-82), com o horário do servidor da região (US/EU) disponível como referência. *(proposta — confirmar)* |

## Suporte e erros

| ID | Regra |
|----|-------|
| RN-90 | Todo erro mostrado ao usuário traz mensagem genérica no idioma dele + **código estável** + **ID do erro** (`requestId`); nunca stack trace. *(proposta — confirmar)* |
| RN-91 | Em qualquer página o usuário pode **reportar um problema** (descrição + e-mail opcional); o reporte salva automaticamente página, `requestId`, idioma, região, fuso, navegador e versão, e chega ao admin. Limite: 5 reportes por hora por IP. *(proposta — confirmar)* |
| RN-92 | **Chat de suporte**: qualquer visitante abre uma conversa pelo botão de chat em qualquer página. Visitante informa e-mail (nome opcional) e passa por CAPTCHA; logado ou na página do pedido, a conversa já vem ligada à conta/pedido. *(aprovada em 2026-11-06)* |
| RN-93 | Estados da conversa: `aberta → em_atendimento → resolvida`; `resolvida → aberta` se o cliente responder em até 7 dias; depois disso, nova conversa. Fila por ordem de chegada; cada conversa tem um atendente responsável. *(proposta — confirmar)* |
| RN-94 | Mensagens em tempo real. Se o cliente não estiver na página, recebe e-mail no idioma dele com link assinado para retomar a conversa (validade 7 dias). Visitante retoma pelo cookie da conversa ou pelo link. *(proposta — confirmar)* |
| RN-95 | O chat mostra fixo, no idioma do cliente: "Nunca pediremos sua senha da Battle.net nem dados do cartão". Número de cartão (validação Luhn) e frase-semente de carteira detectados numa mensagem são **mascarados antes de gravar**. Atendente nunca pede credenciais (RN-03). *(proposta — confirmar)* |
| RN-96 | Anexos no chat: só imagem (PNG, JPEG, WebP), até 5 MB, até 3 por mensagem; guardados privados e servidos por URL assinada. *(proposta — confirmar)* |
| RN-97 | Limites: 3 conversas abertas por e-mail/IP; 20 mensagens por minuto por conversa. *(proposta — confirmar)* |
| RN-98 | A conversa guarda o idioma do cliente; atendentes cadastram os idiomas que falam e a fila mostra primeiro as conversas nos idiomas do atendente. Mensagens **não** são traduzidas automaticamente no MVP. *(proposta — confirmar)* |
| RN-99 | Horário de atendimento configurado pelo admin (guardado em UTC, exibido no fuso do cliente — RN-83). Fora do horário, o chat vira formulário offline (mensagem + e-mail) e mostra quando o atendimento volta. *(proposta — confirmar)* |
