import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { signOut } from "@/features/auth/actions";

// Só navegação; a permissão é conferida em cada página e action (requireStaff)
export default async function PanelLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  const link = "rounded-full px-3 py-2 text-sm font-semibold text-heading hover:bg-accent";
  return (
    <>
      <header className="border-b border-border">
        <nav
          aria-label={t("title")}
          className="mx-auto flex max-w-[1350px] flex-wrap items-center gap-1 px-4 py-3"
        >
          <Link href={`/${locale}/admin`} className="mr-3 font-heading text-lg font-bold text-heading">
            {t("title")}
          </Link>
          <Link href={`/${locale}/admin/pedidos`} className={link}>
            {t("nav.orders")}
          </Link>
          <Link href={`/${locale}/admin/reportes`} className={link}>
            {t("nav.reports")}
          </Link>
          <Link href={`/${locale}/admin/categorias`} className={link}>
            {t("nav.categories")}
          </Link>
          <Link href={`/${locale}/admin/produtos`} className={link}>
            {t("nav.products")}
          </Link>
          <Link href={`/${locale}/admin/promocoes`} className={link}>
            {t("nav.promotions")}
          </Link>
          <Link href={`/${locale}/admin/cupons`} className={link}>
            {t("nav.coupons")}
          </Link>
          <Link href={`/${locale}/admin/auditoria`} className={link}>
            {t("nav.audit")}
          </Link>
          <Link href={`/${locale}`} className={link}>
            {t("nav.store")}
          </Link>
          <form action={signOut} className="ml-auto">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("nav.signOut")}
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto grid w-full max-w-[1350px] gap-8 px-4 py-8">{children}</main>
    </>
  );
}
