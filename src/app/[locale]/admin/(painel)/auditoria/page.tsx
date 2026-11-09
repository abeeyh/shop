import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { AutoSubmitForm } from "@/components/molecules/AutoSubmitForm";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { changedFields } from "@/features/admin/diff";
import { tableCls } from "@/features/admin/fields";
import { listAudit } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import type { Entity } from "@/features/admin/audit";
import { listStaff } from "@/features/staff/queries";
import { canonicalLocale } from "@/i18n/routing";
import { parseCursor, toCursor } from "@/lib/pagination";
import { getTimezone } from "@/lib/preferences";

// RF-30: entidades que aparecem no filtro (as mesmas da auditoria — audit.ts)
const ENTITIES: Entity[] = [
  "category",
  "tag",
  "subcategory", // histórico (antes das tags — #160)
  "product",
  "promotion",
  "coupon",
  "order",
  "bug_report",
  "staff",
  "support_hours",
];

export const instant = false;

const show = (v: unknown) =>
  v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

function AuditFilters(p: {
  base: string;
  entity: string | undefined;
  staffId: string | undefined;
  staff: Awaited<ReturnType<typeof listStaff>>;
  t: T;
}) {
  const { base, entity, staffId, staff, t } = p;
  return (
    <AutoSubmitForm action={base} role="search" className="flex flex-wrap gap-2">
      <Select name="entidade" defaultValue={entity ?? ""} aria-label={t("audit.what")} className="w-auto">
        <option value="">{t("audit.allEntities")}</option>
        {ENTITIES.map((e) => (
          <option key={e} value={e}>
            {t(`audit.entities.${e}`)}
          </option>
        ))}
      </Select>
      <Select name="quem" defaultValue={staffId ?? ""} aria-label={t("audit.who")} className="w-auto">
        <option value="">{t("audit.everyone")}</option>
        {staff.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.email}
          </option>
        ))}
      </Select>
    </AutoSubmitForm>
  );
}

// cursor "mais antigas / mais recentes" mantendo os filtros
function AuditPager(p: {
  base: string;
  keep: URLSearchParams;
  cursor: boolean;
  more: boolean;
  last: Parameters<typeof toCursor>[0] | undefined;
  t: T;
}) {
  const { base, keep, cursor, more, last, t } = p;
  const link = buttonVariants({ variant: "ghost", size: "sm" });
  if (!cursor && !more) return null;
  return (
    <nav aria-label={t("nav.audit")} className="flex justify-center gap-3">
      {cursor ? (
        <Link href={`${base}?${keep}`} className={link}>
          {t("audit.newest")}
        </Link>
      ) : null}
      {more && last ? (
        <Link href={`${base}?${keep}&antes=${encodeURIComponent(toCursor(last))}`} className={link}>
          {t("audit.older")}
        </Link>
      ) : null}
    </nav>
  );
}

// RN-71: últimas alterações do dashboard (quem, quando, antes → depois). RF-30: filtro por entidade/pessoa
export default async function AuditAdmin({ params, searchParams }: PageProps<"/[locale]/admin/auditoria">) {
  await connection();
  const [{ locale }, { antes, entidade, quem }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const cursor = parseCursor(antes);
  const [t, staff, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listStaff(),
    getTimezone(),
  ]);
  // só valores conhecidos viram filtro (entrada não confiável — docs/09)
  const entity = ENTITIES.find((e) => e === entidade);
  const staffId = staff.find((m) => m.userId === quem)?.userId;
  const { rows, more } = await listAudit(cursor, undefined, { entity, staffId });
  const keep = new URLSearchParams({
    ...(entity ? { entidade: entity } : {}),
    ...(staffId ? { quem: staffId } : {}),
  });
  const lang = canonicalLocale(locale);
  const base = `/${locale}/admin/auditoria`;
  const last = rows.at(-1);
  return (
    <>
      <PageHeader title={t("nav.audit")} description={t("audit.subtitle")} />
      <AuditFilters base={base} entity={entity} staffId={staffId} staff={staff} t={t} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("audit.when")}</th>
                <th>{t("audit.who")}</th>
                <th>{t("audit.what")}</th>
                <th>{t("audit.changes")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const after = r.after as Record<string, unknown>;
                const before = r.before as Record<string, unknown> | null;
                // exclusão: o "depois" fica vazio — o nome vem do "antes" e não há campos a comparar (doc 17 §3)
                const changes = r.action === "delete" ? [] : changedFields(before, after);
                const label = after.name ?? after.code ?? before?.name ?? before?.code;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap">
                      <LocalTime iso={r.createdAt.toISOString()} locale={lang} timeZone={timeZone} />
                    </td>
                    <td>{r.staffEmail}</td>
                    <td className="text-heading">
                      {t(`audit.actions.${r.action as "create" | "update" | "delete"}`)}{" "}
                      {t(`audit.entities.${r.entity as Entity}`)}: {show(label)}
                    </td>
                    <td>
                      <ul className="grid gap-0.5 text-xs">
                        {changes.map((c) => (
                          <li key={c.field}>
                            <span className="text-muted-foreground">{c.field}:</span> {show(c.from)} →{" "}
                            {show(c.to)}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t("audit.empty")} />
      )}
      <AuditPager base={base} keep={keep} cursor={!!cursor} more={more} last={last} t={t} />
    </>
  );
}
