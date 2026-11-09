import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdminNav, type AdminNavGroup, type AdminNavItem } from "@/features/admin/components/AdminNav";
import { getStaff } from "@/features/auth/staff";

// #144: barra lateral com o que o papel abre (RN-06). Só navegação: a permissão continua conferida em
// cada página e action (requireStaff); sem sessão, a página manda para o login.
async function Sidebar({ locale }: { locale: string }) {
  const [staff, t, nav] = await Promise.all([
    getStaff(),
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  if (!staff) return null;
  const admin = staff.role === "admin";
  const base = `/${locale}/admin`;
  const item = (key: AdminNavItem["key"], path: string): AdminNavItem => ({
    key,
    href: `${base}${path}`,
    label: t(`nav.${key}`),
  });
  const groups: AdminNavGroup[] = [
    {
      label: t("groups.operation"),
      items: [
        item("overview", ""), // RF-20: suporte também tem a visão geral dele
        item("support", "/suporte"),
        item("orders", "/pedidos"),
        item("reports", "/reportes"),
      ],
    },
    ...(admin
      ? [
          {
            label: t("groups.catalog"),
            items: [
              item("categories", "/categorias"),
              item("subcategories", "/subcategorias"),
              item("products", "/produtos"),
              item("promotions", "/promocoes"),
              item("coupons", "/cupons"),
            ],
          },
        ]
      : []),
    {
      label: t("groups.manage"),
      items: [
        ...(admin ? [item("team", "/equipe"), item("audit", "/auditoria")] : []),
        item("docs", "/docs"),
      ],
    },
  ];
  return (
    <AdminNav
      locale={locale}
      homeHref={base}
      title={t("title")}
      groups={groups}
      account={[item("twoFactor", "/2fa"), { key: "store", href: `/${locale}`, label: t("nav.store") }]}
      user={{ email: staff.user.email, role: t(admin ? "team.admin" : "team.support") }}
      labels={{ nav: t("title"), menu: nav("menu"), close: nav("closeMenu"), signOut: t("nav.signOut") }}
    />
  );
}

export default async function PanelLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* a sessão só existe na requisição (cacheComponents): até lá, a coluna vazia segura o layout */}
      <Suspense fallback={<div aria-hidden="true" className="hidden border-r border-border lg:block" />}>
        <Sidebar locale={locale} />
      </Suspense>
      <main className="mx-auto grid w-full max-w-[1200px] content-start gap-8 px-4 py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
