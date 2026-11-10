# 11 — Design system

Componentes com **shadcn/ui + Tailwind CSS**, organizados por **Atomic Design**. Tema: **escuro** (único no MVP).

Referência visual: começou no template **Enfhess (dark)** da ThemeMarch (análise em [15](15-referencia-layout.md)); desde o #102 a loja tem identidade própria — escura, minimalista, violeta + ouro (seções 1 e 8). Fontes e raios seguem a referência. Não copiamos HTML, CSS, JS nem imagens de template.

## 1. Paleta

| Papel | Hex | Uso |
|-------|-----|-----|
| Fundo | `#08080c` | Fundo das páginas (preto neutro levemente frio) |
| Superfície | `#101017` | Cards, linhas de produto, painéis (com transparência + desfoque) |
| Popover | `#15151e` | Gaveta de compra, painel do globo |
| Superfície de input | `#14141d` | Inputs, selects |
| Borda | `#ffffff14` (branco 8%) | Divisórias, inputs |
| Primária | `#6d4aff` (violeta) | Botão principal — branco sobre ela 5,15:1 |
| Primária hover | `#5a37ec` | Hover da primária (6,58:1) |
| Ouro | `#f5c451` | **Preço** e destaques de valor (11,6:1 sobre a superfície) — lembra o gold do jogo |
| Link / anel de foco | `#a99bff` | Links e foco (8,4:1 sobre o fundo) |
| Gradiente — início | `#6d4aff` | Só decorativo: aurora, slider, ícones, borda do "Popular" |
| Gradiente — fim | `#22d3ee` (ciano) | Idem |
| Destrutivo / erro | `#e11d48` | Excluir, erros (4,7:1 com branco) |
| Texto de erro | `#fb7185` | Mensagem de erro sobre o fundo (7,4:1) |
| Texto principal | `#f7f7fb` (títulos) / `#c8c8d4` (corpo) | 12,1:1 |
| Texto secundário | `#8e8ea3` | Legendas, placeholders (6,2:1 no fundo; 5,7:1 no input) |

*(#102, 2026-11-07: paleta trocada pelo designer com aprovação do dono — antes: azul-marinho do template Enfhess com primária `#2f63e6` e gradiente rosa→azul.)*

### 1.1 Temas

A tabela acima é o tema padrão (**Violeta neon**). O cliente pode trocar por outro tema no menu de idioma (RN-111). Cada tema troca só os valores dos mesmos tokens (`:root[data-theme="…"]` no `globals.css`); papéis e regras desta seção valem para todos. Contraste AA de todos conferido em [design/prototipo-paletas.html](../design/prototipo-paletas.html).

| Tema (`data-theme`) | Fundo | Primária (texto sobre ela) | Gradiente | Clima |
|---|---|---|---|---|
| `violeta` (padrão) | `#08080c` | `#6d4aff` (branco) | `#6d4aff` → `#22d3ee` | o original |
| `brasa` | `#0c0806` | `#ff6a2b` (`#1a0b03`) | `#ff3d1f` → `#ffb020` | forja, urgência |
| `vil` | `#050a07` | `#3ee07f` (`#03140a`) | `#3ee07f` → `#14c8ff` | neon "gamer" |
| `gelo` | `#050912` | `#4cc3ff` (`#021320`) | `#4cc3ff` → `#a98bff` | calmo, premium |
| `carmesim` | `#0b0607` | `#d91e47` (branco) | `#e5294f` → `#ff8a3d` | dramático; erro vira `#fca5a5` |
| `ouro` | `#09090b` | `#f5c451` (`#1a1305`) | `#f5c451` → `#ff7a45` | luxo minimalista |
| `vazio` | `#08070a` | `#ff2e88` (`#1a0410`) | `#ff2e88` → `#8b5cf6` | quase monocromático |

O tema é aplicado por um script curto no `<head>` antes da pintura (sem piscar) e a página continua estática.

Regras:
- Toda combinação de texto/fundo com contraste ≥ 4,5:1 (conferir antes de aprovar a paleta).
- Primária só em destaques: **uma ação principal por tela**.
- Erro sempre na cor destrutiva.
- Nenhuma cor nova fora desta tabela sem atualizar este doc.
- Gradiente nunca é fundo de texto pequeno; texto sobre card com gradiente a 20% usa os tokens de texto normais.

## 2. Tokens (shadcn + Tailwind v4)

`src/app/globals.css`:

```css
/* src/app/globals.css (resumo — o arquivo é a fonte) */
:root {
  --radius: 0.875rem;
  --heading: #f7f7fb;  --foreground: #c8c8d4;  --muted-foreground: #8e8ea3;
  --background: #08080c;  --card: #101017;  --popover: #15151e;  --input: #14141d;
  --border: #ffffff14;  --secondary: #ffffff0f;  --muted: #ffffff0f;  --accent: #ffffff17;
  --primary: #6d4aff;  --primary-hover: #5a37ec;  --primary-foreground: #ffffff;
  --link: #a99bff;  --ring: #a99bff;  --gold: #f5c451;
  --gradient-from: #6d4aff;  --gradient-to: #22d3ee;
  --destructive: #e11d48;  --error-text: #fb7185;
}
/* @theme inline expõe cada um como cor do Tailwind: bg-card, text-gold, from-gradient-from… */
```

Componentes usam **só tokens** (`bg-primary`, `text-muted-foreground`); hex fora do `globals.css` é proibido.

## 3. Tipografia, espaço e forma

- Fontes (do template): **Inter** nos títulos e **Mulish** no corpo, pesos 400/500/600/700, via `next/font/google` (auto-hospedadas, sem chamada ao Google em runtime). Chinês (`zh-Hant`, `zh-Hans`): pilha de fontes do sistema (PingFang, Microsoft JhengHei/YaHei, Noto Sans CJK) — não baixar fonte CJK inteira.
- Textos em alemão e francês ficam ~30% maiores que em inglês: botões e menus não podem ter largura fixa; testar telas nos 6 idiomas.
- Datas, horas, números e moedas sempre por `Intl` no idioma e fuso do usuário — nunca formatar à mão.
- Escala: 12 / 14 / 16 / 20 / 24 / 32 px; títulos com `clamp()`.
- Espaçamento: escala de 4 px do Tailwind.
- Raio (do template): **15 px** cards e painéis, **10 px** cards pequenos, **5 px** inputs, **pílula (9999 px)** botões, badges e busca, 50% avatares.
- Container: largura máxima **1200 px** na loja (#102) e no conteúdo do admin, ao lado da barra lateral de 16 rem (#144); margem lateral 16–20 px no celular.
- Ícones: lucide-react, 16/20 px.

## 4. Acessibilidade (obrigatório)

- Foco visível em tudo (`ring-2 ring-ring ring-offset-2`).
- Contraste ≥ 4,5:1 para texto.
- Tudo por teclado; diálogos com foco preso.
- `aria-label` em botões só com ícone; `aria-live` em conteúdo que atualiza sozinho.
- Animações respeitam `prefers-reduced-motion`.

## 5. Atomic Design

| Nível | O que é | Pode | Não pode |
|-------|---------|------|----------|
| **Átomo** | Menor peça visual | Props e variantes (`cva`) | Estado de negócio, API |
| **Molécula** | 2+ átomos com uma função | Estado local de UI | Buscar dados, regras RN |
| **Organismo** | Seção completa | Genérico (`src/components`): só props. De domínio (`features/<x>/components`): hooks e ações da própria feature | Layout de página; genérico importar `features/*` |
| **Template** | Esqueleto com slots | Layout, grid, responsividade | Dados reais, lógica |
| **Página** | Rota em `src/app` | Buscar dados, compor | Estilo próprio |

Importação só **para baixo**: página → template → organismo → molécula → átomo.

```
src/components/{atoms,molecules,organisms,templates}   # genéricos, sem domínio
src/features/<feature>/components/                     # moléculas e organismos de domínio
src/app/                                               # páginas
```

Se o componente **conhece o domínio**, fica na feature; se é genérico, em `src/components`.

### Inventário

| Nível | Componente | Local |
|-------|-----------|-------|
| Átomo | `Button` (variantes `primary`, `gradient-outline`, `ghost`, `destructive`), `IconButton`, `Input`, `Label`, `Avatar`, `Badge`, `Switch`, `Tooltip`, `Separator`, `Skeleton`, `Spinner` | `components/atoms` |
| Átomo | `Tooltip` (#130: dica de botão de ícone no hover **e** no foco por Tab; o nome acessível fica no `aria-label` do botão) | `components/atoms` |
| Molécula | `FormField`, `PasswordField`, `CopyField`, `Toast`, `LocaleSwitcher`, `TimezoneSwitcher`, `PriceTag` (USDT + estimativa; preço original riscado em promoção) | `components/molecules` |
| Molécula | `Collapsible` (expandir/recolher com `<details>`; aberto a partir de `lg`), `Pagination` (página na URL), `LoadingRegion` + `CardGridSkeleton` / `TableSkeleton` / `TitleSkeleton` (esqueletos com a forma do conteúdo, `role="status"` com texto para leitor de tela; `Skeleton` sem animação com `prefers-reduced-motion`) | `components/molecules` |
| Molécula | `NavTabs` (abas de categoria; aba atual por `usePathname` em `Suspense`), `Popover` (`<details>` com estado no React; Esc e clique fora fecham), `Drawer` (barra lateral em `<dialog>` modal: foco preso, Esc e clique no fundo fecham; base do `CartSheet` — #109), `SpotlightTracker` (um ouvinte para a luz do cursor) — #102 |
| Molécula | `SearchBox` (domínio, `features/catalog`: busca no cabeçalho com sugestões — combobox ARIA com setas, Enter e Esc; sem JS continua formulário GET — #110), `FilterChip` (filtro ativo removível), `SectionHeading` (título + link "ver todos"), `FilterTabs`, `Countdown`, `GradientCard` (moldura com gradiente) | `components/molecules` |
| Molécula | `ProductGallery`, `ProductDetailsText`, `ProductFaq` (domínio, `features/catalog` — #136: galeria que rola de lado com scroll-snap, sem JS; descrição em parágrafos; FAQ com `<details>` nativo, fechada até clicar). Ilustrações em `public/catalog/` são arquivos próprios (SVG com cores fixas é permitido: não são componentes) e toda imagem tem `alt` | `features/catalog/components` |
| Organismo | `Header` (uma linha: logo, busca e, à direita, **idioma · carrinho · usuário · sair** — #130, cada ícone com `Tooltip` e foco visível no Tab; abas de categoria embaixo — #102; sem região — loja só US), `Footer` (texto, links e "reportar problema"; colunas e newsletter quando houver conteúdo), `Carousel` (CSS scroll-snap, sem biblioteca) | `components/organisms` |
| Template | `MarketingTemplate`, `AuthTemplate`, `AppTemplate` | `components/templates` |
| Domínio | `VariantPicker` (#100: um eixo por linha — slider para valores em sequência, caixas para escolhas soltas; mostra o preço e a nota da combinação), `ProductFilters` (painel lateral no desktop, gaveta no celular), `SortSelect`, `CategoryCard`, `ServiceCard`, `RaidSlotCard` (com `Countdown`), `BestSellerCard`, `AdvantageItem`, `ServiceOptionsDrawer` | `features/catalog`, `features/schedule` |
| Domínio (compra e conta) | `BuyBox` (preço, opções, personagem, total, "Comprar agora"/"Adicionar"), `ProductPanel` (página do produto), `CartSheet` (carrinho na barra lateral — #109), `AccountForms` (cadastro, login, personagens, excluir conta — RN-107 a RN-109) | `features/cart`, `features/account` |
| Molécula | `PageHeader` (título, apoio e ação principal — RF-02), `EmptyState` (lista vazia com o próximo passo — RF-03), `StatCard` (número da visão geral, com link), `ConfirmSubmit` (confirmação em `<dialog>` antes de ação que muda estado — RF-05) | `components/molecules` |
| Átomo | `StatusBadge` (selo com cor **e** texto: neutral, info, success, warning, danger — RF-07; cor do status do pedido em `features/orders/status-tone.ts`) | `components/atoms` |
| Organismo | `AuthShell` (telas de entrada da equipe: marca, "voltar à loja", título, apoio e o cartão do formulário — RF-32) | `components/organisms` |
| Molécula | `CopyButton` (copia um texto e confirma por 2 s — link do convite) | `components/molecules` |
| Domínio (admin) | `ProductOptionsEditor` (adicionais em linhas, eixos com estilo e valores, grade de preços gerada dos eixos — incluir, preço, sob consulta, nota; escreve o mesmo texto que o servidor valida — RF-09 a RF-11), `TagPicker` (tag principal + outras tags do produto — #160) | `features/admin/components` |
| Domínio (admin) | `RouteDrawer` (gaveta de criar/editar aberta pela URL `?novo=1`/`?editar=id`; `wide` para o produto — RF-04), `DeleteEntity` (excluir com confirmação; só marca o registro — RN-72, #158; categoria com produtos avisa), `ListFilters` (busca + categoria + status na URL, select filtra na hora — RF-03) | `features/admin/components` |
| Domínio (admin) | `AdminNav` (#144: barra lateral fixa no desktop e gaveta no celular; links agrupados em Operação, Catálogo e Gestão, com ícone e página atual marcada — `aria-current`; mostra só o que o papel abre, RN-06; 2FA, Loja, usuário e Sair no rodapé) | `features/admin` |
| Domínio (conta) | `Avatar` (avatar pronto ou inicial, no gradiente do tema — #162), `ProfileForm` (nome + avatares em rádios), `SupportPanel` (chat da conta no perfil + histórico) | `features/account/components` |
| Domínio (suporte) | `ChatOpenButton` (abre o chat com mensagem pronta: consultar preço, agendar run), `ChatLauncher` (botão flutuante), `ChatWindow`, `ChatMessage`, `ChatComposer`, `OfflineForm`, `SupportQueue` (dashboard) | `features/support` |

### Convenções
- Um componente por arquivo, `PascalCase.tsx`, props tipadas, `className` repassado com `cn()`.
- Variantes com `class-variance-authority`.
- Nenhum texto fixo: tudo via sistema de tradução (mesmo com um idioma só).
- Carregamento (#88): nunca tela vazia nem texto "Carregando…" solto — `loading.tsx` (loja e admin) e fallbacks de `<Suspense>` usam os esqueletos com a mesma grade do conteúdo (sem pulo de layout). Seções independentes ficam em `<Suspense>` separados para chegarem sozinhas (streaming).
- Lazy loading: código que só serve depois de um clique entra com `next/dynamic` (ex.: a conversa do chat, com SSE, só baixa quando o cliente abre).

## 6. Reuso de componentes (obrigatório)

**O estilo mora no componente; quem usa só escolhe as opções.**

1. Visual definido uma vez, por variantes `cva` (`variant`, `size`, estados).
2. Na chamada, `className` **só para layout**: margem, largura, posição no flex/grid. Proibido: cor, fundo, borda, padding, fonte, raio, sombra, hover.
3. Visual novo → **variante nova no componente**, nunca estilo na chamada.
4. Antes de criar, procure no inventário e em `src/components/`.
5. Mesma combinação 3 vezes → componente próprio.

```tsx
// src/components/atoms/Button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "size-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
```

```tsx
<Button variant="destructive" size="sm">{t("delete")}</Button>     // ✅
<Button className="w-full mt-4">{t("save")}</Button>                // ✅ só layout
<Button className="bg-yellow-300 px-6 rounded-xl">Salvar</Button>   // ❌
```

Garantia: revisão de PR, agente `frontend-ui` e checagem no CI de classes visuais em `className` na chamada de átomos.

## 7. Responsividade (obrigatório)

- Toda tela funciona de **360 px a 1920 px**, sem rolagem horizontal.
- **Mobile-first**: estilo base para celular; `md:` (768 px) e `lg:` (1024 px) acrescentam.
- Layout fluido (`flex-wrap`, grid com `minmax`, `max-width`); nada de largura fixa em containers.
- Margens laterais de 16–20 px no celular; alvos de toque ≥ 44 px; nada depende de *hover*.
- E2E em dois tamanhos: 390×844 e 1440×900.
- Painéis secundários (ex.: filtros da busca) usam `Collapsible` (`<details>` nativo): **recolhido no celular**, para os resultados virem primeiro, e aberto no desktop; o botão mostra quantos filtros estão ativos (#90).
- E2E confere que as páginas principais não têm rolagem horizontal em 360 px.

## 8. Estilo visual

#102 (2026-11-07): **minimalista, escuro e com destaque nos pontos de ação** — tudo a poucos cliques.

- **Cabeçalho em uma linha:** logo · busca · globo (idioma e fuso, já detectados) · conta · carrinho; logo abaixo, **abas das categorias** (rolam de lado no celular, aba atual marcada). Sem menu escondido.
- **Produtos em lista densa** (`ProductCard` em linha): ícone · nome + etiquetas (tags do produto, "Popular") + descrição curta · preço em **ouro** ("a partir de" quando tem opções) · "Comprar". A linha inteira é o link. Nada de imagem decorativa repetida.
- **Tags** como chips de filtro fixos no topo da lista (`?tag=`); a página agrupa pela tag principal (#160).
- **Compra:** da lista, o produto abre na **página dele**, com as opções (#109). "Comprar agora" adiciona e vai direto ao pagamento; "Adicionar ao carrinho" abre o **carrinho na barra lateral** (itens, total, ir ao pagamento ou continuar comprando).
- **"Popular"** só nos destaques escolhidos (borda em gradiente girando) — selo em tudo não destaca nada.
- **Efeitos** (todos desligados com `prefers-reduced-motion`):
  - aurora violeta/ciano desfocada no topo da página, andando devagar;
  - luz que segue o cursor em linhas e blocos (`data-spotlight` + `SpotlightTracker`; só mouse);
  - brilho que atravessa o botão principal no hover + halo violeta;
  - barra lateral do carrinho entra deslizando (de baixo no celular);
  - slider de opções com trilho em gradiente;
  - #164: linha de produto e bloco de categoria **sobem 2 px** no hover; o herói da home **entra uma vez** (opacidade + 10 px, `@keyframes enter`).
- Uma ação principal por tela continua valendo (botão violeta); a secundária usa `gradient-outline`.
- Imagens: arte **própria ou licenciada**; nada de arte oficial da Blizzard.
- **#166 — ícones das categorias:** SVG no estilo de RPG de fantasia (WoW) do **game-icons.net** (Lorc e Delapouite, **CC BY 3.0**; crédito no rodapé da loja): gold = duas moedas, raid = cabeça de dragão, Mythic+ = portão de masmorra, PvP = espadas cruzadas, conquistas = troféu, delves = entrada de caverna. Guardados como caminho SVG em `features/catalog/components/kind-icons.ts` (cor do tema via `currentColor`). Ícones oficiais do jogo continuam fora (arte da Blizzard).
- **#166 — lista ou grade:** na categoria e na busca o cliente escolhe a exibição (`ViewToggle`); lista é o padrão. A escolha vai na URL (`?vista=grade`) e fica lembrada num cookie (`vista`, não sensível). Na grade, `ProductTile`: ícone grande da categoria, nome, etiquetas, preço e "Comprar" (o cartão inteiro é o link).
- **#164 (redesenho guiado pelas skills de design — ui-ux-pro-max na auditoria, taste-skill em 3 regras; paleta e fontes deste doc mantidas):**
  - home: herói em 2 colunas no desktop com o **produto em destaque** de verdade (o popular mais vendido que tem imagem: imagem, preço, "Ver opções"); categorias em grade compacta (2 colunas no celular, 1 linha no desktop, ícone em cima do nome);
  - página do produto no celular: **compra logo depois do título** (galeria e descrição longa vêm depois);
  - categoria: o card não repete a tag que já é o título da seção;
  - alvos de toque ≥ 44 px também nas abas, chips, logo e selects; etiquetas com texto ≥ 12 px; trilho de abas esmaece na borda no celular (indica que rola).
