# 01 — Visão do produto

*Rascunho — confirmar com o dono do projeto.*

## Problema

Jogadores de **World of Warcraft** querem gold, itens de raid e progresso em Mythic+ sem gastar dezenas de horas. As lojas que vendem isso costumam ter preço só em uma moeda, poucos idiomas e horários de raid em fuso fixo, o que confunde quem está em outro país.

## Proposta

Loja de serviços de WoW (Retail US) com preço-base em **USDT**, pagamento em **cripto (USDT) ou cartão**, site em **6 idiomas** e horários de raid mostrados automaticamente no **fuso do cliente**, com opção de trocar. Referência de mercado: [blazingboost.com](https://blazingboost.com/) (só como referência de funcionalidades — nada de copiar marca, textos ou visual).

## Público

- Jogadores de WoW Retail nas regiões **US** e **EU**.
- Falantes de inglês, francês, alemão, português (BR), chinês tradicional e simplificado.
- Admin/lojista, **atendentes de suporte** e equipe de entrega (boosters/fornecedores de gold).

## Diferenciais

1. Preço único em USDT, sem surpresa de câmbio; estimativa na moeda local (RN-12, RN-18).
2. Horários no fuso do cliente, detectados sozinhos (RN-82, RN-83).
3. 6 idiomas desde o lançamento (RN-80).

## Escopo do MVP

| Dentro | Fora (backlog) |
|--------|----------------|
| Catálogo com categorias e produtos criados pelo admin (tipos gold, raid, dungeon) — só WoW Retail US (RN-13, RN-14, RN-19) | Outros jogos; Classic/MoP/Hardcore; servidores TW/CN |
| Seletor de idioma e fuso no cabeçalho (loja só US — RN-14) | Serviços *piloted* (login na conta do cliente) — RN-03 |
| Agenda de raids com vagas por horário | Chat direto com booster; tradução automática no chat |
| **Chat de suporte** para qualquer visitante, com contas de suporte (RN-04 a RN-07, RN-92 a RN-99) | |
| Checkout em USDT (gateway cripto) e cartão | Programa de fidelidade/cashback |
| Pedido confirmado só por webhook; acompanhamento do pedido | Avaliações/Trustpilot |
| Dashboard admin: categorias, produtos, preços, **promoções por tempo, cupons**, agenda, pedidos, prova de entrega (RN-70) | App mobile |

## Restrições que o usuário precisa saber

- **Termos da Blizzard proíbem** venda de gold por dinheiro real e boosting pago. Não é crime no Brasil, mas: contas de clientes podem ser punidas, a Blizzard pode agir contra a loja, e **a Stripe e o PayPal proíbem esse tipo de venda** (ver [14](14-pagamentos-internacionais.md)).
- Alguns países tratam boosting de forma mais dura (ex.: Coreia do Sul). Consultar advogado sobre países bloqueados.
- Cartão com venda de moeda de jogo exige processador "high-risk": taxa maior, reserva de saldo e mais chargeback.

## Métricas de sucesso (90 dias após lançamento)

- Conversão visita → pedido pago: [meta].
- Taxa de chargeback em cartão: **< 0,9%** (acima disso as bandeiras penalizam).
- Pedidos concluídos dentro do prazo prometido: [meta].
