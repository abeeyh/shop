# 17 — Requisitos do painel e das contas

Análise de requisitos das telas do admin e das funções de cada papel (#146). Base: leitura das 19 telas em 2026-11-09 e as regras do [02](02-regras-de-negocio.md). Os IDs `RF-xx` são estáveis (não renumerar; requisito removido fica *revogado*). Cada item diz a regra que atende e o estado.

Estados: **feito**, **fazer** (entra nesta rodada), **depois** (fora desta rodada, com issue).

## 1. Papéis

| Papel | Entra por | Pode (RN-06) | Não pode |
|---|---|---|---|
| Visitante | — | comprar sem conta (RN-01), chat, reportar problema | — |
| Cliente | `/entrar` (RN-107) | o do visitante + personagens salvos, "minhas compras", excluir a conta | entrar no painel |
| Suporte | `/admin/entrar` (RN-110) | chat, pedidos (sem valores de cartão/cotação), avançar pedido com prova, reportes, documentação, 2FA | preços, catálogo, promoções, cupons, equipe, auditoria, faturamento |
| Admin | `/admin/entrar` | tudo do suporte + catálogo, preços, promoções, cupons, equipe, horários, auditoria, faturamento | apagar o que já foi usado em pedido (RN-72) |

## 2. Requisitos comuns do painel

| ID | Requisito | Estado |
|---|---|---|
| RF-01 | Barra lateral agrupada, página atual marcada, só o que o papel abre (#144) | feito |
| RF-02 | Toda tela tem cabeçalho igual (título, descrição curta, ação principal) — componente `PageHeader` | componente pronto (#148); telas na próxima rodada |
| RF-03 | Toda lista tem estado vazio com o próximo passo, e busca quando passar de uma tela | componente pronto (#148); telas na próxima rodada |
| RF-04 | Criar e editar em gaveta (`Drawer`) — a lista continua visível; fechar não perde a lista | fazer |
| RF-05 | Ação destrutiva ou que muda estado (excluir, desativar, resolver, avançar pedido, assumir) pede confirmação e mostra o resultado | componente pronto (#148); telas na próxima rodada |
| RF-06 | Datas no fuso de quem vê, com o fuso escrito; um formatador só (hoje há 5 cópias) | fazer |
| RF-07 | Status com selo de cor (ativo/inativo, status do pedido, vigente/agendada/expirada) — `StatusBadge` | componente pronto (#148); telas na próxima rodada |
| RF-08 | Tabelas viram cartões no celular; nada de rolagem lateral na página | fazer |

## 3. CRUD por entidade (admin)

C = criar, R = listar/ver, U = editar, D = excluir. Excluir só o que **nunca** foi usado (RN-72); o resto só desativa — o botão explica por quê.

| Entidade | C | R | U | D | Regras | Estado |
|---|---|---|---|---|---|---|
| Categoria | ✔ | ✔ busca | ✔ | ✔ sem produtos e sem pedidos | RN-13, RN-72, RN-73 | fazer (falta D, busca, gaveta) |
| Subcategoria | ✔ | ✔ filtro por categoria | ✔ | ✔ sem produtos | RN-72 | fazer |
| Produto | ✔ | ✔ busca + filtro categoria/ativo | ✔ | ✔ nunca vendido nem em carrinho | RN-17, RN-19, RN-72, RN-106 | fazer |
| Promoção | ✔ | ✔ selo vigente/agendada/expirada | ✔ | ✔ (não tem uso registrado em pedido) | RN-21 a RN-24 | fazer |
| Cupom | ✔ | ✔ usos/limite | ✔ | ✔ nunca usado | RN-25 a RN-28, RN-72 | fazer |
| Membro da equipe | convite | ✔ papel, 2FA, convites pendentes | ✔ papel/idiomas/ativo | — (desativa; auditoria precisa do autor) | RN-04 a RN-06 | fazer (convites pendentes, copiar link, confirmação) |
| Horário de atendimento | — | ✔ | ✔ | — | RN-99 | feito |
| Horário de raid (slot) | ✔ | ✔ | ✔ | ✔ sem reserva | RN-11, RN-16 | depois (#16) |
| Conteúdo da página do serviço | — | — | ✔ | — | #136 | depois (#137: precisa de armazenamento de arquivos) |

Produto — editores visuais no lugar do texto livre (RF-09 a RF-11):

| ID | Requisito | Estado |
|---|---|---|
| RF-09 | Adicionais em linhas (nome + %), com adicionar/remover | fazer |
| RF-10 | Eixos de variação em linhas (nome, estilo slider/caixas, valores) | fazer |
| RF-11 | Combinações como grade de preços gerada a partir dos eixos (cada linha: valores, preço, nota, ativa) | fazer |
| RF-12 | Subcategoria filtrada pela categoria escolhida | fazer |

## 4. Operação (suporte e admin)

| ID | Tela | Requisito | Estado |
|---|---|---|---|
| RF-20 | Visão geral | Suporte: conversas abertas (e a mais antiga), pedidos a fazer, reportes novos. Admin: o mesmo + pedidos e **faturamento de hoje** (só admin — RN-06), promoções/cupons perto de vencer, equipe sem 2FA, atividade recente | feito (#148) |
| RF-21 | Pedidos | Abas a fazer/todos (`NavTabs`), busca por ID ou e-mail, selo de status, responsável, estado vazio | feito (#150) |
| RF-22 | Pedido | Linha do tempo (criado, pago, iniciado, concluído), confirmação antes de avançar, status atualiza na hora, voltar à fila | feito (#150) |
| RF-23 | Suporte (fila) | Contagem, estado vazio, tempo de espera, responsável, idioma por extenso | feito (#150) |
| RF-24 | Conversa | Voltar à fila, assumir/resolver com confirmação, pedidos do cliente ao lado (mesmo e-mail) | feito (#150) |
| RF-25 | Reportes | Contagem de novos, cartões legíveis, resolver com confirmação | feito (#150) |

## 5. Gestão (admin)

| ID | Tela | Requisito | Estado |
|---|---|---|---|
| RF-30 | Auditoria | Filtro por entidade e por pessoa; mudanças como "campo: antes → depois" | fazer |
| RF-31 | Documentação | Markdown formatado, com índice | depois |
| RF-32 | Telas de entrada (login, código, 2FA, convite) | Casca única com a marca e "voltar à loja"; convite vencido explica o próximo passo | fazer |

## 6. Cliente

| ID | Requisito | Regra | Estado |
|---|---|---|---|
| RF-40 | Cadastro, entrar, sair, voltar à página | RN-107, #130 | feito |
| RF-41 | Personagens salvos | RN-108 | feito |
| RF-42 | Minhas compras com status e link do pedido | RN-107 | feito |
| RF-43 | Tema salvo na conta | RN-111 | feito |
| RF-44 | Excluir a conta | RN-109 | feito |
| RF-45 | Conversa do chat ligada à conta | RN-92 | depois (#113) |
| RF-46 | Exportar meus dados (LGPD) | doc 09 §4 | depois (#113) |
| RF-47 | Fuso e idioma no perfil | RN-82 | depois (#113) |

## 7. Pagamento — em manutenção

Decisão do dono (2026-11-09): o checkout fica **em manutenção** até as ferramentas abaixo existirem. O cliente monta o carrinho normalmente; ao pagar, vê "pagamentos em manutenção" e o servidor recusa sem criar pedido nem reservar vaga (`PAYMENTS_ENABLED=false`, padrão). Ligar = `PAYMENTS_ENABLED=true` **e** o provedor configurado.

| # | Ferramenta | Para quê | Situação | Onde |
|---|---|---|---|---|
| P1 | **Gateway cripto** (sugestão: NOWPayments) — conta, chave da API e segredo do IPN | Fatura USDT TRC-20/ERC-20 e confirmação por IPN | código pronto (`src/lib/payments/crypto.ts`, webhook); falta conta e confirmar por escrito que aceitam o setor | [14 §2](14-pagamentos-internacionais.md#2-usdt-cripto), #25 |
| P2 | **Cartão** — on-ramp do gateway (cartão → USDT) ou processador high-risk | Pagar com cartão | sem provedor; bloqueado com aviso | [14 §3](14-pagamentos-internacionais.md#3-cartão), #25 |
| P3 | **E-mail transacional** | Link do pedido, confirmação de pagamento, prova de entrega | não escolhido | #29 |
| P4 | **CAPTCHA** | Proteger checkout e cadastro de bots | não escolhido | #29 |
| P5 | **Hospedagem de produção** com domínio próprio e HTTPS | IPN precisa de URL pública estável | hom na VM; produção a decidir | #2 |
| P6 | **CNPJ, contador e Termos/política de reembolso** | Exigidos pelo gateway e pela lei | pendente | [14 §5 e §7](14-pagamentos-internacionais.md#7-pendências) |

Ordem para ligar: P6 → P1 (sandbox) → P3 → P5 → P1 (produção) → `PAYMENTS_ENABLED=true`. P2 e P4 podem vir depois do primeiro pagamento real.
