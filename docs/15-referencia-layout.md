# 15 — Referência de layout (Enfhess dark)

Fonte: [ThemeMarch — Enfhess dark, Home 2](https://thememarch.com/demo/html/enfhess-html/enfhess-dark/index_2.html). Analisado em 2026-11-06.

## 1. O que é o template

Template HTML de **marketplace de NFT** (Home "NFT Home Two"), da ThemeMarch, com versões clara e escura. Stack do template: HTML estático + CSS próprio (classes `cs-*`) + carrossel **Slick** (jQuery).

**Licença:** é um produto pago. Usamos **só a direção visual** (cores, fontes, raios, organização das seções), reimplementada em Next.js + Tailwind + shadcn ([03](03-stack.md)). Se quisermos copiar código, CSS ou imagens do template, é preciso **comprar a licença**. As imagens da demo não podem ser usadas em nenhum caso.

## 2. Identidade visual extraída

| Item | Template | Nosso token ([11](11-design.md)) |
|------|----------|----------------------------------|
| Fundo | `#080326` | igual |
| Superfície (header, menus) | `#110D2E` | igual |
| Input / modal | `#0f0935` | igual |
| Cards | gradiente `116.85deg, #FC466B → #3F5EFB` a 20% | igual |
| Botão principal | `#3772ff` | **`#2f63e6`** (o original dá 4,19:1 com texto branco) |
| Texto do corpo | branco 80% | igual (`#cecdd4`) |
| Texto secundário | branco 45% | **branco 60%** (o original dá 4,41:1) |
| Bordas | branco 10% | igual |
| Fontes | Inter (títulos), Mulish (corpo), 400–700 | iguais, via `next/font` |
| Raios | 15 px cards, 10 px, 5 px, pílula `1.6em` nos botões | iguais |
| Container | 1350 px | igual |
| Hover | `scale(1.02–1.04)`, `translateY(-3px)` | igual, respeitando `prefers-reduced-motion` |

## 3. Seções do template → seções da loja

| # | Seção no template | Na loja (WoW) | Observação |
|---|-------------------|---------------|-----------|
| 1 | Header: logo, menu com submenus, notificações, perfil com saldo em ETH, botões "Create" e "Connect Wallet" | Logo; **busca de produtos** (RN-100); menu **Gold · Raids · Dungeons · Como funciona · Suporte**; seletores de **região**, **idioma** e **fuso**; carrinho; Entrar/Conta | Sem carteira nem notificações no MVP |
| 2 | Hero: título forte, subtítulo, 2 CTAs | Título + subtítulo; CTA principal **"Comprar gold"** e secundário (gradient-outline) **"Agendar raid"** | Uma ação principal por tela |
| 3 | Top Category (6 cards com imagem) | **3 categorias**: Gold, Raids, Dungeons | `CategoryCard` |
| 4 | Top Seller (cards de vendedores com Follow) | Removida | Não existe vendedor público |
| 5 | Live Auction (cards com **contagem regressiva**, lance atual) | **Próximas raids**: slot no fuso do cliente, contagem até o início, vagas restantes, preço em USDT | Encaixe perfeito com RN-16 e RN-83 |
| 5b | Página Explore (filtro lateral) | **Produtos** (`/wow/produtos`): busca + filtros (categoria, região, preço, promoção, disponível) e ordenação; gaveta de filtros no celular | RN-100 a RN-104 |
| 6 | New Items com abas de filtro | **Serviços** com abas Todos / Gold / Raids / Dungeons + filtro de região | `FilterTabs` + `ServiceCard` |
| 7 | Top Collection (volume, preço mínimo) | **Mais vendidos** | `BestSellerCard` |
| 8 | Competitive Advantages (4 blocos) | **Pagamento em USDT ou cartão · Self-play seguro (RN-03) · 6 idiomas e seu fuso · Entrega com prova (RN-52)** | `AdvantageItem` |
| 9 | Banner de CTA ("Connect Wallet") | Banner **"Pague em USDT ou cartão"** com CTA para o catálogo | — |
| 10 | Logos de parceiros | **Meios de pagamento aceitos** (USDT TRC-20/ERC-20, bandeiras de cartão) | Só logos com direito de uso |
| 11 | Footer: 3 colunas + newsletter + redes | **Serviços · Conta · Empresa (Termos, Reembolso, Privacidade, FAQ)** + newsletter + seletor de idioma | Termos e reembolso são obrigatórios para o provedor de cartão ([14](14-pagamentos-internacionais.md)) |
| 11b | — (não existe no template) | **Botão flutuante de chat** no canto inferior direito, em todas as páginas; abre a janela de conversa (gaveta no celular) | `ChatLauncher` + `ChatWindow`; não cobre o CTA principal no celular |
| 12 | Modal "Place a Bid" (saldo, taxa, quantidade) | **Gaveta de opções do serviço**: realm, facção, personagem, quantidade/dificuldade/slot, total em USDT + estimativa | `ServiceOptionsDrawer` |

Páginas internas do template que servem de modelo: Explore (→ catálogo), Explore Details (→ detalhe do serviço), Help Center e FAQ (→ suporte), Login/Register, Terms/Privacy, 404, Profile/My Activity (→ meus pedidos).

## 4. O que **não** vamos trazer

| Item | Motivo |
|------|--------|
| jQuery + Slick | Fora da stack; carrossel com CSS scroll-snap, sem biblioteca |
| Versão clara (night mode) | MVP só com tema escuro |
| Conexão de carteira, ETH, lances, seguir vendedores | Não fazem parte do produto |
| Imagens, ícones e textos da demo | Licença do template / sem relação com o produto |

## 5. Pendências

- [ ] Arte própria ou licenciada para hero e cards de categoria (sem arte oficial da Blizzard).
- [ ] Logo e nome da loja.
- [ ] Decidir se compra a licença do template (só se quiser copiar código/CSS).
