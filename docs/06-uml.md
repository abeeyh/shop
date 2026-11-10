# 06 — UML

Diagramas em Mermaid. Atualize junto com qualquer mudança em [02](02-regras-de-negocio.md) ou [04](04-arquitetura.md).

## 1. Casos de uso

```mermaid
flowchart LR
  C((Comprador))
  A((Admin))
  P((Provedores de<br/>pagamento))
  S((Suporte))
  subgraph Shop
    UC0([Escolher idioma e fuso])
    UC_CONTA([Criar conta, salvar personagens, excluir conta — RN-107 a RN-109])
    UC1([Navegar por categorias e produtos])
    UC13([Buscar e filtrar produtos])
    UC2([Escolher slot de raid])
    UC3([Pagar em USDT ou cartão])
    UC4([Acompanhar pedido])
    UC5([Gerenciar categorias, produtos e preços])
    UC8([Gerenciar promoções por tempo e cupons])
    UC9([Aplicar cupom])
    UC10([Conversar com o suporte])
    UC11([Atender conversas e pedidos])
    UC12([Gerenciar equipe e horário de atendimento])
    UC6([Atribuir, entregar, provar entrega, reembolsar])
    UC7([Confirmar pagamento])
  end
  C --> UC13
  C --> UC0 & UC1 & UC2 & UC3 & UC4 & UC9 & UC10
  A --> UC5 & UC6 & UC8 & UC11 & UC12
  S --> UC6 & UC11
  P --> UC7
```

## 2. Classes (domínio)

```mermaid
classDiagram
  class Category {
    +id: string
    +kind: gold|raid|dungeon|pvp|achievement|delve
    +name: string
    +slug: string
    +sortOrder: int
    +active: boolean
    +deletedAt: datetime?
  }
  class Tag {
    +id: string
    +name: string
    +slug: string
    +sortOrder: int
    +active: boolean
    +deletedAt: datetime?
  }
  class Product {
    +id: string
    +region: US
    +name: string
    +priceUsdtCents: int
    +unit: string
    +addons: name+percent[]
    +maxQuantity: int
    +priceOnRequest: boolean
    +hot: boolean
    +sortOrder: int
    +optionAxes: name+values+style[]
    +details: string
    +images: src+alt[]
    +faq: q+a[]
    +active: boolean
    +deletedAt: datetime?
  }
  class ProductVariant {
    +options: eixo→valor
    +priceUsdtCents: int
    +priceOnRequest: boolean
    +note: string
    +active: boolean
  }
  class Promotion {
    +type: percent|fixed
    +value: int
    +scope: store|category|product
    +startsAt: Date (UTC)
    +endsAt: Date (UTC)
    +deletedAt: datetime?
  }
  class Coupon {
    +code: string
    +type: percent|fixed
    +value: int
    +scope: store|category|product
    +startsAt: Date (UTC)
    +endsAt: Date (UTC)
    +maxUses: int?
    +maxUsesPerEmail: int?
    +minOrderUsdtCents: int?
    +deletedAt: datetime?
  }
  class CouponRedemption {
    +email: string
    +status: reserved|used|released
  }
  class RaidSlot {
    +startsAt: Date (UTC)
    +capacity: int
    +reserved: int
  }
  class Customer {
    +email: string
  }
  class Character {
    +realm: string
    +faction: alliance|horde
    +name: string
  }
  class Order {
    +id: string
    +email: string
    +locale: string
    +region: US
    +status: OrderStatus
    +subtotalUsdtCents: int
    +discountUsdtCents: int
    +discountSource: promotion|coupon|none
    +totalUsdtCents: int
    +paymentMethod: usdt|card
    +network: string?
    +txHash: string?
    +quoteRate: decimal?
    +chargedAmount: int?
    +chargedCurrency: string?
  }
  class Cart {
    +id: uuid
  }
  class CartItem {
    +quantity: int
    +options: json
  }
  class OrderItem {
    +unitPriceUsdtCents: int
    +quantity: int
    +options: json
    +characterName: string
    +realm: string
    +faction: string
  }
  class Delivery {
    +proofUrl: string
    +deliveredAt: Date
  }
  class PaymentEvent {
    +provider: string
    +providerEventId: string
    +type: string
  }
  Category "1" *-- "*" Product
  Product "0..*" --> "0..*" Tag : tags (posição 0 = principal)
  Cart "1" *-- "*" CartItem
  CartItem "*" --> "1" Product
  CartItem "*" --> "0..1" RaidSlot
  Product "1" *-- "*" RaidSlot
  Product "1" *-- "0..*" ProductVariant
  CartItem "*" --> "0..1" ProductVariant
  OrderItem "*" --> "0..1" ProductVariant
  Promotion "*" --> "*" Product : aplica a
  Promotion "*" --> "*" Category : aplica a
  Coupon "1" *-- "*" CouponRedemption
  CouponRedemption "*" --> "1" Order
  Order "1" *-- "1..*" OrderItem
  Customer "1" *-- "0..10" Character
  Customer "0..1" --> "*" Order : compras logado
  OrderItem "*" --> "1" Product
  OrderItem "*" --> "0..1" RaidSlot
  Order "1" -- "0..1" Delivery
  Order "1" <-- "*" PaymentEvent
  class StaffProfile {
    +role: suporte|admin
    +languages: string[]
    +active: boolean
  }
  class SupportConversation {
    +userId: string?
    +locale: string
    +status: aberta|em_atendimento|resolvida
    +guestEmail: string?
    +lastMessageAt: Date
  }
  class SupportMessage {
    +authorType: customer|staff|system
    +body: string (mascarado)
    +createdAt: Date
  }
  SupportConversation "1" *-- "*" SupportMessage
  SupportConversation "*" --> "0..1" Order
  SupportConversation "*" --> "0..1" User : conta (#162)
  SupportConversation "*" --> "0..1" StaffProfile : atendente
```

## 3. Sequência — compra

```mermaid
sequenceDiagram
  actor U as Comprador
  participant W as App
  participant DB as Banco
  participant FX as Cotação
  participant P as Provedor (cripto ou cartão)
  U->>W: Finalizar compra (USDT ou cartão)
  W->>DB: recalcula total em USDT (RN-20), cria pedido solicitado, reserva gold/vaga (RN-34)
  alt cartão
    W->>FX: cotação USDT→moeda do cartão
    W->>DB: grava cotação travada 15 min (RN-36)
  end
  W->>P: createCheckout
  P-->>U: fatura USDT (rede) ou checkout de cartão (3-D Secure)
  U->>P: paga
  P->>W: webhook/IPN assinado
  W->>W: verifyWebhook
  W->>DB: insere payment_event (único — RN-33)
  W->>DB: pedido → pago ou pagamento_parcial (RN-32, RN-37)
  W-->>U: e-mail no idioma do pedido
```

## 4. Estados — pedido (RN-50, RN-51)

```mermaid
stateDiagram-v2
  [*] --> solicitado: checkout
  solicitado --> aguardando_pagamento: cliente clica em Pagar
  solicitado --> pago: suporte confirma à mão (#170)
  aguardando_pagamento --> pago: IPN ou suporte confirma
  aguardando_pagamento --> pagamento_parcial: USDT a menor (suporte avalia)
  pagamento_parcial --> pago: complemento ou suporte confirma
  solicitado --> cancelado: 2 h sem pagamento
  aguardando_pagamento --> cancelado: 2 h sem pagamento
  aguardando_pagamento --> falha_pagamento: falha/contestação
  pagamento_parcial --> falha_pagamento: falha/contestação
  pago --> falha_pagamento: contestação (admin)
  pago --> agendado: equipe agenda
  agendado --> concluido_parcial: prova parcial (RN-52)
  agendado --> concluido: prova de entrega (RN-52)
  concluido_parcial --> concluido: prova de entrega
  pago --> reembolso_solicitado: cliente ou equipe
  agendado --> reembolso_solicitado
  concluido_parcial --> reembolso_solicitado
  concluido --> reembolso_solicitado
  reembolso_solicitado --> reembolsado: só admin
  cancelado --> [*]
  falha_pagamento --> [*]
  reembolsado --> [*]
  concluido --> [*]
```

## 4b. Atividade — preço final (RN-20 a RN-29)

```mermaid
flowchart TD
  A[Itens do carrinho] --> B[Preço-base de cada produto no banco]
  B --> C[Promoções ativas agora para cada produto<br/>pega a de maior desconto — RN-23]
  C --> D[Total com promoção]
  B --> E{Cupom informado?}
  E -- não --> F[Total final = total com promoção]
  E -- sim --> G{Cupom válido?<br/>janela, usos, mínimo, escopo — RN-25}
  G -- não --> H[Erro genérico — RN-28] --> F
  G -- sim --> I[Total com cupom sobre o preço-base]
  D --> J{Qual dá maior desconto? — RN-26}
  I --> J
  J --> K[Total final + origem do desconto gravados no pedido — RN-29]
  F --> K
```

## 4c. Estados — conversa de suporte (RN-93)

```mermaid
stateDiagram-v2
  [*] --> aberta: cliente abre
  aberta --> em_atendimento: atendente assume
  em_atendimento --> resolvida: atendente resolve
  resolvida --> aberta: cliente responde em até 7 dias
  resolvida --> [*]: 7 dias sem resposta
```

## 5. Implantação

```mermaid
flowchart TB
  BR[Navegador] --> CDN[DNS/CDN]
  CDN --> HOM[App homologação<br/>branch hom]
  CDN --> PROD[App produção<br/>tag vX.Y.Z]
  HOM --> DBH[(Banco hom)]
  PROD --> DBP[(Banco prod)]
  HOM -. sandbox .-> PAYT[Provedores em modo teste]
  PROD --> PAYR[Provedores reais]
  GH[CI] -- imagem --> REG[Registry]
  REG --> HOM
  REG -- mesma imagem, aprovação --> PROD
```
