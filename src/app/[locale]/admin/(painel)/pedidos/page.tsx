import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { tableCls } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { formatUsdt } from "@/features/catalog";
import { listOrdersForStaff } from "@/features/orders/staff";

export const instant = false;

// "a fazer" = pago (assumir) e em andamento (entregar) — RN-50
const TODO = ["pago", "em_andamento"] as const;

// RN-06: suporte e admin veem a fila de pedidos
export default async function OrdersAdmin({ params, searchParams }: PageProps<"/[locale]/admin/pedidos">) {
  await connection();
  const [{ locale }, { todos }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale, ["admin", "suporte"]);
  const all = todos === "1";
  const [t, o, rows] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Order" }),
    listOrdersForStaff(all ? null : [...TODO]),
  ]);
  const base = `/${locale}/admin/pedidos`;
  const tab = "rounded-full px-3 py-1.5 text-sm font-semibold";

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.orders")}</h1>
      <nav aria-label={t("nav.orders")} className="flex gap-2">
        <Link
          href={base}
          aria-current={all ? undefined : "page"}
          className={`${tab} ${all ? "" : "bg-accent"}`}
        >
          {t("orders.todo")}
        </Link>
        <Link
          href={`${base}?todos=1`}
          aria-current={all ? "page" : undefined}
          className={`${tab} ${all ? "bg-accent" : ""}`}
        >
          {t("orders.all")}
        </Link>
      </nav>
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th>{t("audit.when")}</th>
              <th>{t("orders.order")}</th>
              <th>{t("table.status")}</th>
              <th>{o("total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">
                  {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td>
                  <Link href={`${base}/${r.id}`} className="font-mono text-link hover:underline">
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td>{o(`statuses.${r.status}`)}</td>
                <td>{formatUsdt(locale, r.totalUsdtCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
