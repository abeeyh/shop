import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { Input, Textarea } from "@/components/atoms/Input";
import { GradientCard } from "@/components/molecules/GradientCard";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { Field } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { describeItem } from "@/features/cart/describe";
import { formatUsdt } from "@/features/catalog";
import { nextStaffStep } from "@/features/orders/rules";
import { getOrderForStaff } from "@/features/orders/staff";
import { advance } from "@/features/orders/staff-actions";
import type { ItemOptions } from "@/features/pricing/rules";
import { maskEmail } from "@/lib/logger";

export const instant = false;

// RN-06: suporte não vê hash completo nem e-mail completo; admin vê tudo
const shortHash = (h: string | null) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "—");

export default async function OrderAdmin({ params }: PageProps<"/[locale]/admin/pedidos/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const order = z.uuid().safeParse(id).success ? await getOrderForStaff(id) : null;
  if (!order) notFound();
  const [t, o, c] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Order" }),
    getTranslations({ locale, namespace: "Cart" }),
  ]);
  const admin = staff.role === "admin";
  const step = nextStaffStep(order.status);
  const row = "flex flex-wrap justify-between gap-2 text-sm";

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">
        {t("orders.order")} <span className="font-mono">{order.id.slice(0, 8)}</span>
      </h1>
      <GradientCard tone="solid" className="grid gap-3">
        <p className={row}>
          <span>{t("table.status")}</span>
          <strong data-testid="staff-order-status" className="text-heading">
            {o(`statuses.${order.status}`)}
          </strong>
        </p>
        <p className={row}>
          <span>{t("login.email")}</span>
          <span>{admin ? order.email : maskEmail(order.email)}</span>
        </p>
        <p className={row}>
          <span>{t("orders.tx")}</span>
          <span className="font-mono">{admin ? (order.txHash ?? "—") : shortHash(order.txHash)}</span>
        </p>
        <ul className="grid gap-2 border-t border-border pt-3 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex flex-wrap justify-between gap-2">
              <span>
                <span className="text-heading">{i.productName}</span> ·{" "}
                {describeItem(i.options as ItemOptions, i.quantity, c)}
              </span>
              <span>{formatUsdt(locale, i.unitPriceUsdtCents * i.quantity - i.discountUsdtCents)}</span>
            </li>
          ))}
        </ul>
        <p className={`${row} border-t border-border pt-3`}>
          <span>{o("total")}</span>
          <strong className="text-heading">{formatUsdt(locale, order.totalUsdtCents)}</strong>
        </p>
        {order.delivery ? (
          <p className={row}>
            <span>{t("orders.proof")}</span>
            <a href={order.delivery.proofUrl} rel="noopener noreferrer" className="text-link hover:underline">
              {order.delivery.proofUrl}
            </a>
          </p>
        ) : null}
      </GradientCard>

      {step ? (
        <GradientCard tone="solid" className="grid gap-4">
          <ActionForm
            action={advance}
            locale={locale}
            id={order.id}
            submit={t(step === "start" ? "orders.start" : "orders.complete")}
            saved={t("form.saved")}
            errors={{
              generic: t("formErrors.generic"),
              proofUrl: t("orders.proofError"),
              stale: t("orders.stale"),
            }}
          >
            <input type="hidden" name="step" value={step} />
            {step === "complete" ? (
              <>
                <Field label={t("orders.proofUrl")}>
                  <Input name="proofUrl" type="url" required maxLength={500} />
                </Field>
                <Field label={t("orders.note")}>
                  <Textarea name="note" maxLength={1000} />
                </Field>
              </>
            ) : null}
          </ActionForm>
        </GradientCard>
      ) : null}
    </>
  );
}
