import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Drawer } from "@/components/molecules/Drawer";
import { ProductPanel } from "@/features/cart/ProductPanel";
import { getProduct } from "@/features/catalog";
import { getTimezone } from "@/lib/preferences";

// #102: vindo da lista (navegação no app), o produto abre numa gaveta por cima — a lista continua atrás.
// Mesma validação da página (RN-19): inexistente/inativo/na categoria errada → 404.
export default async function ProductDrawer({ params }: PageProps<"/[locale]/wow/[category]/[product]">) {
  await connection();
  const { locale, category, product: slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product || product.categorySlug !== category) notFound();
  const [c, timeZone] = await Promise.all([getTranslations({ locale, namespace: "Catalog" }), getTimezone()]);
  return (
    <Drawer closeLabel={c("close")}>
      <ProductPanel locale={locale} product={product} timeZone={timeZone} compact />
    </Drawer>
  );
}
