CREATE TABLE "product_tags" (
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_tags_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_tags_tag_idx" ON "product_tags" USING btree ("tag_id");--> statement-breakpoint
-- #160: as subcategorias viram tags (o mesmo slug em categorias diferentes vira uma tag só, ex.: "normal")
INSERT INTO "tags" ("name", "slug", "sort_order", "active", "deleted_at")
SELECT DISTINCT ON (s."slug") s."name", s."slug", s."sort_order", s."active", s."deleted_at"
FROM "subcategories" s
ORDER BY s."slug", s."deleted_at" NULLS FIRST, s."sort_order"
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
-- cada produto ganha a tag da subcategoria que tinha, como tag principal (posição 0)
INSERT INTO "product_tags" ("product_id", "tag_id", "position")
SELECT p."id", t."id", 0
FROM "products" p
JOIN "subcategories" s ON s."id" = p."subcategory_id"
JOIN "tags" t ON t."slug" = s."slug"
ON CONFLICT DO NOTHING;
