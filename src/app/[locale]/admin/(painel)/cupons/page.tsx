import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { saveCoupon } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { DiscountFields, valueOf } from "@/features/admin/DiscountFields";
import { Field, tableCls } from "@/features/admin/fields";
import { crudLabels, deleteLabels, formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllProducts, listCoupons } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { LocalTime } from "@/components/molecules/LocalTime";
import { DISCOUNT_TONE, discountState } from "@/features/admin/discount-window";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

const optional = (n: number | null) => (n === null ? "" : String(n));

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

// RF-04: gaveta de criar/editar (fora da página: a página fica simples)
function Editor(p: {
  edit: Awaited<ReturnType<typeof listCoupons>>[number]["coupon"] | null;
  locale: string;
  base: string;
  t: T;
  cats: Awaited<ReturnType<typeof listAllCategories>>;
  prods: Awaited<ReturnType<typeof listAllProducts>>;
}) {
  const { edit, locale, base, t, cats, prods } = p;
  const c = crudLabels(t);
  const v = {
    code: "",
    maxUses: "",
    maxUsesPerEmail: "",
    minOrder: "",
    ...(edit && {
      code: edit.code,
      maxUses: optional(edit.maxUses),
      maxUsesPerEmail: optional(edit.maxUsesPerEmail),
      minOrder: edit.minOrderUsdtCents ? (edit.minOrderUsdtCents / 100).toFixed(2) : "",
    }),
  };
  return (
    <RouteDrawer
      title={edit ? t("form.edit", { name: edit.code.toUpperCase() }) : t("form.newCoupon")}
      closeHref={base}
      closeLabel={c.close}
    >
      <ActionForm
        key={edit?.id ?? "new"}
        action={saveCoupon}
        locale={locale}
        id={edit?.id}
        submit={t("form.save")}
        saved={t("form.saved")}
        errors={formErrors(t)}
      >
        <div className="grid gap-4">
          <Field label={t("fields.code")}>
            <Input name="code" required maxLength={40} defaultValue={v.code} />
          </Field>
          <DiscountFields t={t} v={edit} categories={cats} products={prods} />
          <Field label={t("fields.maxUses")}>
            <Input name="maxUses" type="number" min={1} defaultValue={v.maxUses} />
          </Field>
          <Field label={t("fields.maxUsesPerEmail")}>
            <Input name="maxUsesPerEmail" type="number" min={1} defaultValue={v.maxUsesPerEmail} />
          </Field>
          <Field label={t("fields.minOrder")}>
            <Input name="minOrder" inputMode="decimal" defaultValue={v.minOrder} />
          </Field>
        </div>
      </ActionForm>
      {edit ? (
        <DeleteEntity
          entity="coupon"
          id={edit.id}
          locale={locale}
          labels={deleteLabels(t, edit.code.toUpperCase())}
        />
      ) : null}
    </RouteDrawer>
  );
}

// RN-25 a RN-28; RN-72: cupom já usado não é apagado, só desativado (excluir só sem uso — doc 17 §3)
export default async function CouponsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/cupons">) {
  await connection();
  const [{ locale }, { editar, novo }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listCoupons(),
    listAllCategories(),
    listAllProducts(),
    getTimezone(),
  ]);
  const lang = canonicalLocale(locale);
  const now = new Date();
  const edit = rows.find((r) => r.coupon.id === editar)?.coupon ?? null;
  const base = `/${locale}/admin/cupons`;
  const open = !!edit || novo === "1";

  return (
    <>
      <PageHeader
        title={t("nav.coupons")}
        description={t("crud.count", { n: rows.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newCoupon")}
          </Link>
        }
      />
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("fields.code")}</th>
                <th>{t("fields.value")}</th>
                <th>{t("fields.endsAt")}</th>
                <th>{t("table.uses")}</th>
                <th>{t("table.status")}</th>
                <th>
                  <span className="sr-only">{t("form.editLink")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ coupon: c, uses }) => (
                <tr key={c.id}>
                  <td className="font-mono text-heading uppercase">{c.code}</td>
                  <td>{c.type === "percent" ? `${c.value}%` : `${valueOf(c)} USDT`}</td>
                  <td className="whitespace-nowrap">
                    <LocalTime iso={c.endsAt.toISOString()} locale={lang} timeZone={timeZone} />
                  </td>
                  <td>{c.maxUses ? `${uses} / ${c.maxUses}` : uses}</td>
                  <td>
                    <StatusBadge tone={DISCOUNT_TONE[discountState(c, now)]}>
                      {t(`crud.window.${discountState(c, now)}`)}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link
                      scroll={false}
                      href={`${base}?editar=${c.id}`}
                      aria-label={`${t("form.editLink")} ${c.code}`}
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
