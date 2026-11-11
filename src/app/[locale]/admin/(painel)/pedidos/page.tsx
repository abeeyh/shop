import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Pagination } from "@/components/molecules/Pagination";
import { tableCls } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { formatUsdt } from "@/features/catalog";
import { listOrdersForStaff } from "@/features/orders/staff";
import { ORDER_STATUS_TONE } from "@/features/orders/status-tone";
import { canonicalLocale } from "@/i18n/routing";
import { pageCount, pageParam } from "@/lib/pagination";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

// "a fazer" (RN-50, #170): confirmar pagamento (manual ou parcial), agendar, entregar e reembolso pedido
const TODO = [
  "aguardando_pagamento",
  "pagamento_parcial",
  "pago",
  "agendado",
  "concluido_parcial",
  "reembolso_solicitado",
] as const;

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;
type OT = Awaited<ReturnType<typeof getTranslations<"Order">>>;
type Rows = Awaited<ReturnType<typeof listOrdersForStaff>>["rows"];

// RF-21: busca por começo do ID ou e-mail exato (formulário GET: funciona sem JS)
function OrderSearch({
  base,
  all,
  term,
  label,
}: {
  base: string;
  all: boolean;
  term: string;
  label: string;
}) {
  return (
    <form action={base} role="search" className="flex gap-2">
      {all ? <input type="hidden" name="todos" value="1" /> : null}
      <input
        type="search"
        name="q"
        defaultValue={term}
        maxLength={254}
        aria-label={label}
        placeholder={label}
        className="min-h-11 w-64 max-w-full rounded-md border border-border bg-input px-3 text-sm text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
    </form>
  );
}

function OrdersTable(p: { rows: Rows; base: string; locale: string; timeZone: string | null; t: T; o: OT }) {
  const { rows, base, locale, timeZone, t, o } = p;
  const lang = canonicalLocale(locale);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className={tableCls}>
        <thead>
          <tr>
            <th>{t("orders.order")}</th>
            <th>{t("table.status")}</th>
            <th>{o("total")}</th>
            <th>{t("orders.assignee")}</th>
            <th>{t("orders.created")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`${base}/${r.id}`} className="font-mono text-link hover:underline">
                  {r.id.slice(0, 8)}
                </Link>
              </td>
              <td>
                <StatusBadge tone={ORDER_STATUS_TONE[r.status]}>{o(`statuses.${r.status}`)}</StatusBadge>
              </td>
              <td className="font-semibold whitespace-nowrap text-heading">
                {formatUsdt(locale, r.totalUsdtCents)}
              </td>
              <td className="text-muted-foreground">{r.assignee ?? "—"}</td>
              <td className="whitespace-nowrap text-muted-foreground">
                <LocalTime iso={r.createdAt.toISOString()} locale={lang} timeZone={timeZone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// RN-06: suporte e admin veem a fila de pedidos. RF-21 (doc 17): abas, busca, selo, responsável.
export default async function OrdersAdmin({ params, searchParams }: PageProps<"/[locale]/admin/pedidos">) {
  await connection();
  const [{ locale }, { todos, pagina, q }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale, ["admin", "suporte"]);
  const all = todos === "1";
  const page = pageParam(pagina);
  const term = typeof q === "string" ? q.slice(0, 254) : "";
  const [t, o, s, timeZone, { rows, total }] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Order" }),
    getTranslations({ locale, namespace: "Search" }),
    getTimezone(),
    listOrdersForStaff(all ? null : [...TODO], page, term),
  ]);
  const base = `/${locale}/admin/pedidos`;
  const query = (extra: Record<string, string>) =>
    `${base}?${new URLSearchParams({ ...(all ? { todos: "1" } : {}), ...(term ? { q: term } : {}), ...extra })}`;
  const tab = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-accent text-heading" : "text-muted-foreground hover:text-heading"}`;
  return (
    <>
      <PageHeader
        title={t("nav.orders")}
        description={t("orders.count", { n: total })}
        actions={<OrderSearch base={base} all={all} term={term} label={t("orders.search")} />}
      />
      <nav aria-label={t("nav.orders")} className="flex gap-2">
        <Link
          href={term ? `${base}?q=${encodeURIComponent(term)}` : base}
          aria-current={all ? undefined : "page"}
          className={tab(!all)}
        >
          {t("orders.todo")}
        </Link>
        <Link href={query({ todos: "1" })} aria-current={all ? "page" : undefined} className={tab(all)}>
          {t("orders.all")}
        </Link>
      </nav>
      {rows.length ? (
        <OrdersTable rows={rows} base={base} locale={locale} timeZone={timeZone} t={t} o={o} />
      ) : (
        <EmptyState
          title={term ? t("orders.emptySearch") : all ? t("orders.emptyAll") : t("orders.emptyTodo")}
          hint={term ? t("orders.searchHint") : undefined}
        />
      )}
      <Pagination
        page={page}
        pages={pageCount(total)}
        href={(p) => query({ pagina: String(p) })}
        labels={{ nav: s("pagination"), prev: s("prev"), next: s("next") }}
      />
    </>
  );
}
