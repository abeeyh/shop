import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const SECTIONS = [
  ["pedidos", "orders"],
  ["reportes", "reports"],
  ["categorias", "categories"],
  ["produtos", "products"],
  ["promocoes", "promotions"],
  ["cupons", "coupons"],
  ["equipe", "team"],
  ["auditoria", "audit"],
  ["docs", "docs"],
] as const;

export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">
        {t("dashboard.title", { name: staff.user.name })}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(([path, key]) => (
          <Link key={path} href={`/${locale}/admin/${path}`}>
            <GradientCard tone="solid" className="font-heading text-xl font-semibold text-heading">
              {t(`nav.${key}`)}
            </GradientCard>
          </Link>
        ))}
      </div>
    </>
  );
}
