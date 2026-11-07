ALTER TABLE "payment_events" ADD COLUMN "payment_id" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "pay_currency" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "paid_usdt_cents" integer;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "tx_hash" text;