import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { savePromotion } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { DiscountFields, valueOf } from "@/features/admin/DiscountFields";
import { Field, tableCls } from "@/features/admin/fields";
import { crudLabels, deleteLabels, formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllProducts, listPromotions } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { LocalTime } from "@/components/molecules/LocalTime";
import { DISCOUNT_TONE, discountState } from "@/features/admin/discount-window";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

// RF-04: gaveta de criar/editar (fora da página: a página fica simples)
function Editor(p: {
  edit: Awaited<ReturnType<typeof listPromotions>>[number] | null;
  locale: string;
  base: string;
  t: T;
  cats: Awaited<ReturnType<typeof listAllCategories>>;
  prods: Awaited<ReturnType<typeof listAllProducts>>;
}) {
  const { edit, locale, base, t, cats, prods } = p;
  const c = crudLabels(t);
  return (
    <RouteDrawer
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newPromotion")}
      closeHref={base}
      closeLabel={c.close}
    >
      <ActionForm
        key={edit?.id ?? "new"}
        action={savePromotion}
        locale={locale}
        id={edit?.id}
        submit={t("form.save")}
        saved={t("form.saved")}
        errors={formErrors(t)}
      >
        <div className="grid gap-4">
          <Field label={t("fields.name")}>
            <Input name="name" required maxLength={80} defaultValue={edit?.name} />
          </Field>
          <DiscountFields t={t} v={edit} categories={cats} products={prods} />
        </div>
      </ActionForm>
      {edit ? (
        <DeleteEntity entity="promotion" id={edit.id} locale={locale} labels={deleteLabels(t, edit.name)} />
      ) : null}
    </RouteDrawer>
  );
}

// RN-21 a RN-24: promoções por tempo (datas em UTC)
export default async function PromotionsAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/promocoes">) {
  await connection();
  const [{ locale }, { editar, novo }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listPromotions(),
    listAllCategories(),
    listAllProducts(),
    getTimezone(),
  ]);
  const lang = canonicalLocale(locale);
  const now = new Date();
  const edit = rows.find((r) => r.id === editar) ?? null;
  const base = `/${locale}/admin/promocoes`;
  const open = !!edit || novo === "1";

  return (
    <>
      <PageHeader
        title={t("nav.promotions")}
        description={t("crud.count", { n: rows.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newPromotion")}
          </Link>
        }
      />
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
                  <td className="whitespace-nowrap">
                    <LocalTime iso={r.startsAt.toISOString()} locale={lang} timeZone={timeZone} />
                  </td>
                  <td className="whitespace-nowrap">
                    <LocalTime iso={r.endsAt.toISOString()} locale={lang} timeZone={timeZone} />
                  </td>
                  <td>
                    <StatusBadge tone={DISCOUNT_TONE[discountState(r, now)]}>
                      {t(`crud.window.${discountState(r, now)}`)}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link
                      scroll={false}
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
      ) : (
        <EmptyState title={t("crud.empty")} />
      )}
      {open ? <Editor edit={edit} locale={locale} base={base} t={t} cats={cats} prods={prods} /> : null}
    </>
  );
}
