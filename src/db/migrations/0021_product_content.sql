ALTER TABLE "products" ADD COLUMN "details" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "faq" jsonb DEFAULT '[]'::jsonb NOT NULL;