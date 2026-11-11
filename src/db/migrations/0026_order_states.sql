-- #170 (RN-50): nova esteira do pedido. Valores antigos renomeados; o tipo é recriado para manter a ordem.
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "orders" SET "status" = CASE "status"
  WHEN 'pendente' THEN 'aguardando_pagamento'
  WHEN 'em_andamento' THEN 'agendado'
  WHEN 'expirado' THEN 'cancelado'
  WHEN 'contestado' THEN 'falha_pagamento'
  ELSE "status" END;--> statement-breakpoint
-- a linha do tempo (RF-22) lê o status da auditoria: os registros antigos ganham o nome novo
UPDATE "audit_log" SET "after" = jsonb_set("after", '{status}', to_jsonb(CASE "after"->>'status'
  WHEN 'pendente' THEN 'aguardando_pagamento'
  WHEN 'em_andamento' THEN 'agendado'
  WHEN 'expirado' THEN 'cancelado'
  WHEN 'contestado' THEN 'falha_pagamento' END))
  WHERE "entity" = 'order' AND "after"->>'status' IN ('pendente', 'em_andamento', 'expirado', 'contestado');--> statement-breakpoint
UPDATE "audit_log" SET "before" = jsonb_set("before", '{status}', to_jsonb(CASE "before"->>'status'
  WHEN 'pendente' THEN 'aguardando_pagamento'
  WHEN 'em_andamento' THEN 'agendado'
  WHEN 'expirado' THEN 'cancelado'
  WHEN 'contestado' THEN 'falha_pagamento' END))
  WHERE "entity" = 'order' AND "before"->>'status' IN ('pendente', 'em_andamento', 'expirado', 'contestado');--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('solicitado', 'aguardando_pagamento', 'pagamento_parcial', 'pago', 'agendado', 'concluido_parcial', 'concluido', 'reembolso_solicitado', 'reembolsado', 'cancelado', 'falha_pagamento');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'solicitado'::"public"."order_status";
