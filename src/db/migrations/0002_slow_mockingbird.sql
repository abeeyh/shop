CREATE TABLE "raid_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raid_slots_capacity" CHECK ("raid_slots"."capacity" > 0 and "raid_slots"."reserved" >= 0 and "raid_slots"."reserved" <= "raid_slots"."capacity")
);
--> statement-breakpoint
ALTER TABLE "raid_slots" ADD CONSTRAINT "raid_slots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raid_slots_product_starts_idx" ON "raid_slots" USING btree ("product_id","starts_at");