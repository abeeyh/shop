# 11 — Design system

Componentes com **shadcn/ui + Tailwind CSS**, organizados por **Atomic Design**. Tema: **escuro** (único no MVP).

Referência visual: template **Enfhess (dark)** da ThemeMarch — análise em [15](15-referencia-layout.md). Usamos a **direção visual** (paleta, gradiente, fontes, raios, ritmo das seções), reimplementada nos nossos componentes. Não copiamos HTML, CSS, JS nem imagens do template.

## 1. Paleta

| Papel | Hex | Uso |
|-------|-----|-----|
| Fundo | `#080326` | Fundo das páginas (template) |
| Superfície | `#110d2e` | Header, menus, painéis (template) |
| Superfície de input | `#0f0935` | Inputs, modais (template) |
| Borda | `#ffffff1a` (branco 10%) | Divisórias, inputs (template) |
| Primária | `#2f63e6` | Botão principal — **ajustada**: o `#3772ff` do template dá 4,19:1 com texto branco |
| Primária hover | `#2556cc` | Hover da primária (6,4:1) |
| Texto sobre primária | `#ffffff` | 5,19:1 sobre `#2f63e6` |
| Link / anel de foco | `#6b95ff` | Links e foco sobre o fundo (7,0:1) |
| Gradiente — início | `#fc466b` | Só decorativo: bordas, overlays, cards a 20% (template) |
| Gradiente — fim | `#3f5efb` | Idem (template) |
| Destrutivo / erro | `#e11d48` | Excluir, erros (4,7:1 com branco) |
| Texto de erro | `#f43f5e` | Mensagem de erro sobre o fundo (5,4:1) |
| Texto principal | `#ffffff` (títulos) / `#cecdd4` (corpo, branco 80%) | 12,7:1 |
| Texto secundário | `#9c9aa8` (branco 60%) | Legendas, placeholders (7,2:1) — **ajustado**: o branco 45% do template dá 4,41:1 |

Regras:
- Toda combinação de texto/fundo com contraste ≥ 4,5:1 (conferir antes de aprovar a paleta).
- Primária só em destaques: **uma ação principal por tela**.
- Erro sempre na cor destrutiva.
- Nenhuma cor nova fora desta tabela sem atualizar este doc.
- Gradiente nunca é fundo de texto pequeno; texto sobre card com gradiente a 20% usa os tokens de texto normais.

## 2. Tokens (shadcn + Tailwind v4)

`src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --radius: 0.9375rem; /* 15px — cards do template */
  --heading: #ffffff;
  --link: #6b95ff;
  --error-text: #f43f5e;
  --gradient-from: #fc466b;
  --gradient-to: #3f5efb;
  --background: #080326;
  --foreground: #cecdd4;
  --card: #110d2e;
  --card-foreground: #cecdd4;
  --popover: #110d2e;
  --popover-foreground: #cecdd4;
  --primary: #2f63e6;
  --primary-hover: #2556cc;
  --primary-foreground: #ffffff;
  --secondary: #ffffff14;
  --secondary-foreground: #ffffff;
  --muted: #ffffff14;
  --muted-foreground: #9c9aa8;
  --accent: #ffffff1f;
  --accent-foreground: #ffffff;
  --destructive: #e11d48;
  --destructive-foreground: #ffffff;
  --border: #ffffff1a;
  --input: #0f0935;
  --ring: #6b95ff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-heading: var(--heading);
  --color-link: var(--link);
  --color-error-text: var(--error-text);
  --color-gradient-from: var(--gradient-from);
  --color-gradient-to: var(--gradient-to);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --font-sans: var(--font-mulish), var(--font-cjk);
  --font-heading: var(--font-inter), var(--font-cjk);
}

body { background: var(--background); color: var(--foreground); }
:root { --font-cjk: "PingFang TC", "PingFang SC", "Microsoft JhengHei", "Microsoft YaHei", "Noto Sans CJK TC", "Noto Sans CJK SC", sans-serif; }
```

Componentes usam **só tokens** (`bg-primary`, `text-muted-foreground`); hex fora do `globals.css` é proibido.

## 3. Tipografia, espaço e forma

- Fontes (do template): **Inter** nos títulos e **Mulish** no corpo, pesos 400/500/600/700, via `next/font/google` (auto-hospedadas, sem chamada ao Google em runtime). Chinês (`zh-Hant`, `zh-Hans`): pilha de fontes do sistema (PingFang, Microsoft JhengHei/YaHei, Noto Sans CJK) — não baixar fonte CJK inteira.
- Textos em alemão e francês ficam ~30% maiores que em inglês: botões e menus não podem ter largura fixa; testar telas nos 6 idiomas.
- Datas, horas, números e moedas sempre por `Intl` no idioma e fuso do usuário — nunca formatar à mão.
- Escala: 12 / 14 / 16 / 20 / 24 / 32 px; títulos com `clamp()`.
- Espaçamento: escala de 4 px do Tailwind.
- Raio (do template): **15 px** cards e painéis, **10 px** cards pequenos, **5 px** inputs, **pílula (9999 px)** botões, badges e busca, 50% avatares.
- Container: largura máxima **1350 px** (template), margem lateral 16–20 px no celular.
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
| Molécula | `FormField`, `PasswordField`, `CopyField`, `Toast`, `LocaleSwitcher`, `TimezoneSwitcher`, `PriceTag` (USDT + estimativa; preço original riscado em promoção) | `components/molecules` |
| Molécula | `Collapsible` (expandir/recolher com `<details>`; aberto a partir de `lg`), `Pagination` (página na URL), `LoadingRegion` + `CardGridSkeleton` / `TableSkeleton` / `TitleSkeleton` (esqueletos com a forma do conteúdo, `role="status"` com texto para leitor de tela; `Skeleton` sem animação com `prefers-reduced-motion`) | `components/molecules` |
| Molécula | `SearchField` (busca no cabeçalho, `role="search"`), `FilterChip` (filtro ativo removível), `SectionHeading` (título + link "ver todos"), `FilterTabs`, `Countdown`, `GradientCard` (moldura com gradiente) | `components/molecules` |
| Organismo | `Header` (menu + seletores de idioma/fuso + carrinho + conta; sem região — loja só US), `Footer` (4 colunas + newsletter), `Carousel` (CSS scroll-snap, sem biblioteca) | `components/organisms` |
| Template | `MarketingTemplate`, `AuthTemplate`, `AppTemplate` | `components/templates` |
| Domínio | `ProductFilters` (painel lateral no desktop, gaveta no celular), `SortSelect`, `CategoryCard`, `ServiceCard`, `RaidSlotCard` (com `Countdown`), `BestSellerCard`, `AdvantageItem`, `ServiceOptionsDrawer` | `features/catalog`, `features/schedule` |
| Domínio (suporte) | `ChatLauncher` (botão flutuante), `ChatWindow`, `ChatMessage`, `ChatComposer`, `OfflineForm`, `SupportQueue` (dashboard) | `features/support` |

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

Baseado no Enfhess dark ([15](15-referencia-layout.md)):

- Fundo azul-marinho quase preto; cards com **gradiente rosa→azul a 20%** e raio de 15 px.
- Botão principal sólido em pílula; botão secundário com **borda em gradiente** (`gradient-outline`). Uma ação principal por tela continua valendo.
- Seções empilhadas com título à esquerda e "ver todos" à direita; grades de cards e carrosséis horizontais.
- Hover discreto: `scale(1.02–1.04)` ou `translateY(-3px)`, desligado com `prefers-reduced-motion`.
- Imagens: arte **própria ou licenciada**; nada de arte oficial da Blizzard nem imagens do template.
