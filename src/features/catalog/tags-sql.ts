import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { sql } from "drizzle-orm";
import { products, productTags, tags } from "@/db/schema";

// #160: tags do produto (várias; posição 0 = principal). Tag desativada ou excluída não aparece — mas,
// diferente da subcategoria, não esconde o produto (é rótulo, não pasta).
const live = sql`t.active and t.deleted_at is null`;

export const productTagNames = sql<
  string[]
>`coalesce((select array_agg(t.name order by pt.position, t.sort_order, t.name)
  from ${productTags} pt join ${tags} t on t.id = pt.tag_id where pt.product_id = ${products.id} and ${live}), '{}'::text[])`;

export const primaryTagName = sql<
  string | null
>`(select t.name from ${productTags} pt join ${tags} t on t.id = pt.tag_id
  where pt.product_id = ${products.id} and pt.position = 0 and ${live} limit 1)`;

// ordem da página da categoria: pela tag principal (sem tag vai para o fim)
export const primaryTagSort = sql<number>`coalesce((select t.sort_order from ${productTags} pt join ${tags} t on t.id = pt.tag_id
  where pt.product_id = ${products.id} and pt.position = 0 and ${live} limit 1), 9999)`;

export const hasTag = (slug: string) =>
  sql`exists (select 1 from ${productTags} pt join ${tags} t on t.id = pt.tag_id
    where pt.product_id = ${products.id} and t.slug = ${slug} and ${live})`;
