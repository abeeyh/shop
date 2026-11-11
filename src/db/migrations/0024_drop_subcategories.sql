-- #160: as subcategorias viraram tags na 0023 (dados copiados); aqui saem a coluna e a tabela
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_subcategory_id_subcategories_id_fk";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "subcategory_id";--> statement-breakpoint
DROP TABLE "subcategories";
