CREATE TYPE "public"."order_status" AS ENUM('pendente', 'pagamento_parcial', 'pago', 'em_andamento', 'concluido', 'expirado', 'reembolsado', 'contestado');--> statement-breakpoint
CREATE TYPE "public"."payment_network" AS ENUM('trc20', 'erc20');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"raid_slot_id" uuid,
	"product_name" text NOT NULL,
	"options" jsonb NOT NULL,
	"unit_price_usdt_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_quantity" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"locale" text NOT NULL,
	"status" "order_status" DEFAULT 'pendente' NOT NULL,
	"subtotal_usdt_cents" integer NOT NULL,
	"discount_usdt_cents" integer DEFAULT 0 NOT NULL,
	"total_usdt_cents" integer NOT NULL,
	"payment_method" text DEFAULT 'usdt' NOT NULL,
	"network" "payment_network",
	"provider" text,
	"provider_payment_id" text,
	"pay_url" text,
	"paid_usdt_cents" integer,
	"tx_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_amounts" CHECK ("orders"."total_usdt_cents" > 0 and "orders"."subtotal_usdt_cents" >= "orders"."total_usdt_cents")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"order_id" uuid,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_raid_slot_id_raid_slots_id_fk" FOREIGN KEY ("raid_slot_id") REFERENCES "public"."raid_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_expires_idx" ON "orders" USING btree ("status","expires_at");