ALTER TABLE "products" ALTER COLUMN "region" SET DEFAULT 'US';--> statement-breakpoint
-- #92 / RN-14: loja só US. Produtos EU saem da vitrine (desativados, não apagados: podem estar em pedidos)
UPDATE "products" SET "active" = false, "updated_at" = now() WHERE "region" = 'EU';
