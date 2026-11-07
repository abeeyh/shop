import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { GradientCard } from "@/components/molecules/GradientCard";
import { savePromotion } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DiscountFields, toUtcInput, valueOf } from "@/features/admin/DiscountFields";
import { Field, tableCls } from "@/features/admin/fields";
import { formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllProducts, listPromotions } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// RN-21 a RN-24: promoções por tempo (datas em UTC)
export default async function PromotionsAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/promocoes">) {
  await connection();
  const [{ locale }, { editar }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listPromotions(),
    listAllCategories(),
    listAllProducts(),
  ]);
  const edit = rows.find((r) => r.id === editar) ?? null;
  const base = `/${locale}/admin/promocoes`;

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.promotions")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">
          {edit ? t("form.edit", { name: edit.name }) : t("form.newPromotion")}
        </h2>
        <ActionForm
          key={edit?.id ?? "new"}
          action={savePromotion}
          locale={locale}
          id={edit?.id}
          submit={t("form.save")}
          saved={t("form.saved")}
          errors={formErrors(t)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("fields.name")}>
              <Input name="name" required maxLength={80} defaultValue={edit?.name} />
            </Field>
            <DiscountFields t={t} v={edit} categories={cats} products={prods} />
          </div>
        </ActionForm>
        {edit ? (
          <Link href={base} className="text-sm text-link hover:underline">
            {t("form.cancel")}
          </Link>
        ) : null}
      </GradientCard>

      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.value")}</th>
              <th>{t("fields.startsAt")}</th>
              <th>{t("fields.endsAt")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("form.editLink")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-heading">{r.name}</td>
                <td>{r.type === "percent" ? `${r.value}%` : `${valueOf(r)} USDT`}</td>
                <td>{toUtcInput(r.startsAt).replace("T", " ")}</td>
                <td>{toUtcInput(r.endsAt).replace("T", " ")}</td>
                <td>{r.active ? t("table.active") : t("table.inactive")}</td>
                <td>
                  <Link
                    href={`${base}?editar=${r.id}`}
                    aria-label={`${t("form.editLink")} ${r.name}`}
                    className="text-link hover:underline"
                  >
                    {t("form.editLink")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
