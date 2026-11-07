import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { changedFields } from "@/features/admin/audit";
import { tableCls } from "@/features/admin/fields";
import { listAudit } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const show = (v: unknown) =>
  v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

// RN-71: últimas alterações do dashboard (quem, quando, antes → depois)
export default async function AuditAdmin({ params }: PageProps<"/[locale]/admin/auditoria">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAudit()]);
  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.audit")}</h1>
      <div className="overflow-x-auto">
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
              const changes = changedFields(r.before as Record<string, unknown> | null, after);
              return (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap">
                    {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td>{r.staffEmail}</td>
                  <td className="text-heading">
                    {t(`audit.actions.${r.action as "create" | "update"}`)}{" "}
                    {t(`audit.entities.${r.entity as "category" | "product" | "promotion" | "coupon"}`)}:{" "}
                    {show(after.name ?? after.code)}
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
    </>
  );
}
