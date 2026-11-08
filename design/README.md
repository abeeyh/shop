# Protótipos de layout

## Loja minimalista (issue #98) — `prototipo-loja.html`

[`prototipo-loja.html`](prototipo-loja.html) é a proposta de redesign da loja (sem o dashboard), com os 132 produtos reais de `scripts/catalog/products.json`. Mesmo aviso: **não é código do produto**, o JavaScript só simula navegação e preço.

- Cabeçalho em uma linha (logo, busca, idioma/fuso num ícone de globo, carrinho) + abas das categorias.
- Produtos em lista: nome limpo + etiquetas (Heroic, FP 15…) + preço + **Comprar**; no celular a linha inteira abre a compra.
- Subcategorias como abas fixas; "Popular" só nos mais vendidos.
- **Comprar** abre a gaveta de opções (`ServiceOptionsDrawer`) com **Comprar agora** (direto ao pagamento) e **Adicionar ao carrinho**.
- O contador no canto mostra os cliques desde a home (meta: 3 até o pagamento). `?clean=1` esconde o contador.

Para abrir: dois cliques no arquivo, ou `python -m http.server` na pasta `design/`.

## Primeira versão (issue #53) — `prototipo.html`

[`prototipo.html`](prototipo.html) é um protótipo navegável, num único arquivo, das páginas da loja, do dashboard (admin e suporte) e do chat. Ele usa os tokens do [doc 11](../docs/11-design.md) e a estrutura do [doc 15](../docs/15-referencia-layout.md).

> **Não é código do produto.** O JavaScript dele simula o que, no app, o servidor decide: preço, promoção, cupom, cotação, permissões ([doc 04 — "O front só exibe"](../docs/04-arquitetura.md#o-front-só-exibe)).

## Abrir

Dê dois cliques em `design/prototipo.html` (Chrome ou Edge). Parâmetros de URL:

| Parâmetro | Efeito |
|-----------|--------|
| `?demo=1` | Abre com o carrinho preenchido (estados cheios para capturar) |
| `?clean=1` | Esconde o índice "Páginas do protótipo" (use ao capturar para o Figma) |
| `?clean=1&demo=1` | Os dois |

## Páginas (âncora `#/…`)

| Loja | Admin e suporte |
|------|-----------------|
| `#/` home (busca no cabeçalho) | `#/admin` painel |
| `#/products` produtos com busca e filtros (`?q=&cat=&region=&min=&max=&promo=1&disponivel=1&sort=`) | |
| `#/c/gold`, `#/c/raids`, `#/c/mythic-plus` categoria | `#/admin/orders` pedidos (assumir, concluir com prova) |
| `#/p/gold-us` produto gold (realm, facção, quantidade) | `#/admin/categories`, `#/admin/products` (modais) |
| `#/p/raid-heroic-us` produto raid (horário no seu fuso) | `#/admin/promotions`, `#/admin/coupons` |
| `#/p/mplus-us` produto Mythic+ | `#/admin/support` fila do chat |
| `#/cart` carrinho (cupom × promoção) | `#/admin/team`, `#/admin/docs` |
| `#/checkout` USDT ou cartão (cotação travada) | Seletor **Papel**: admin × suporte (suporte recebe 403 em preços e cupons) |
| `#/invoice` fatura USDT (simular pago/parcial) | |
| `#/order` pedido (linha do tempo de status) | |

## Interações que dá para testar

- **Idioma** (6), **região** (US/EU) e **fuso** no cabeçalho: horários de raid e contagens mudam na hora (RN-80 a RN-83, RN-14).
- **Busca** no cabeçalho (mínimo 2 caracteres, tolera erro de digitação: experimente "mithic") e **página de produtos** com filtros de categoria, região, preço, promoção e disponibilidade, ordenação, chips removíveis e estado vazio (RN-100 a RN-104). Os filtros ficam na URL.
- **Promoção** em Gold com preço riscado e contagem até o fim (RN-21, RN-22).
- **Cupons** `WOW10` e `RAID20`: o carrinho aplica o maior desconto entre cupom e promoção (RN-26). Código inválido mostra erro genérico (RN-28).
- **Checkout**: cartão mostra a cotação travada por 15 min (RN-36); USDT leva à fatura com rede em destaque (RN-37).
- **Chat** (botão no canto): aviso de credenciais, número de cartão mascarado na mensagem (RN-95), resposta simulada.
- Responsivo de 360 px a 1920 px; teclado e foco visível; `Esc` fecha chat e modais.

## Levar para o Figma

1. Instale a extensão **html.to.design** no Chrome (e o plugin html.to.design no Figma).
2. Abra `prototipo.html?clean=1&demo=1#/<página>` no Chrome.
3. Para o celular, use o DevTools (`Ctrl+Shift+M`) em **390 × 844**; para desktop, **1440 × 900**.
4. Clique na extensão → **Import** → abra o arquivo gerado no Figma pelo plugin. Cada página vira um frame com camadas editáveis.
5. Repita para cada página da tabela acima (sugestão: um frame mobile e um desktop por página).

## Limites conhecidos

- Textos da loja nos 6 idiomas; carrinho, checkout, fatura e admin estão completos em `en` e `pt-BR` e caem no inglês nos outros (texto final vem do agente `i18n` na F1).
- Imagens são placeholders em gradiente; a arte final deve ser própria ou licenciada (doc 15).
- Nomes de raid são genéricos ("Current raid — Heroic"); o catálogo real é cadastrado pelo admin.
