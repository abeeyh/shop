import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { tableCls } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { listQueue } from "@/features/support/chat";
import { AutoRefresh } from "@/features/support/components/AutoRefresh";
import { sortQueue } from "@/features/support/rules";

export const instant = false;

// RN-93/RN-98: fila por chegada, primeiro nos idiomas do atendente
export default async function SupportQueue({ params }: PageProps<"/[locale]/admin/suporte">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listQueue()]);
  const queue = sortQueue(rows, staff.languages);
  return (
    <>
      <AutoRefresh seconds={15} />
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.support")}</h1>
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th>{t("audit.when")}</th>
              <th>{t("support.customer")}</th>
              <th>{t("support.language")}</th>
              <th>{t("table.status")}</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap">
                  {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td>
                  <Link href={`/${locale}/admin/suporte/${c.id}`} className="text-link hover:underline">
                    {c.guestName ?? c.id.slice(0, 8)}
                  </Link>
                </td>
                <td>
                  {c.locale}
                  {staff.languages.includes(c.locale) ? " ★" : ""}
                </td>
                <td>{t(`support.statuses.${c.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
