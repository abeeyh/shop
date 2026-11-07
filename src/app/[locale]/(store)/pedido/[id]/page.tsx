import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { GradientCard } from "@/components/molecules/GradientCard";
import { formatUsdt } from "@/features/catalog";
import { DeliveryBox, getOrder, isOrderToken, needsScheduling, PaymentBox } from "@/features/orders";
import { ChatOpenButton } from "@/features/support";
import { getDelivery } from "@/features/orders/staff";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/pedido/[id]">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (await getTranslations({ locale, namespace: "Order" }))("title"),
    robots: { index: false },
  };
}

// Dono do pedido sem conta: link assinado (RN-01; docs/04 rotas). Sem token válido = não existe.
export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/pedido/[id]">) {
  await connection();
  const [{ locale, id }, { t: token }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const valid =
    z.uuid().safeParse(id).success && isOrderToken(id, typeof token === "string" ? token : undefined);
  const order = valid ? await getOrder(id) : null;
  if (!order) notFound();
  const [t, delivery] = await Promise.all([
    getTranslations({ locale, namespace: "Order" }),
    order.status === "concluido" ? getDelivery(order.id) : null, // RN-52
  ]);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">{t("title")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span>{t("status")}</span>
          <strong data-testid="order-status" className="font-heading text-lg text-heading">
            {t(`statuses.${order.status}`)}
          </strong>
        </p>
        <ul className="grid gap-2 border-t border-border pt-4 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{i.productName}</span>
              <span>{formatUsdt(locale, i.unitPriceUsdtCents * i.quantity - i.discountUsdtCents)}</span>
            </li>
          ))}
        </ul>
        {order.discountSource === "coupon" ? (
          <p className="flex justify-between gap-4 text-sm text-link">
            <span>{t("discount")}</span>
            <span>−{formatUsdt(locale, order.discountUsdtCents)}</span>
          </p>
        ) : null}
        <p className="flex items-baseline justify-between border-t border-border pt-4">
          <span>{t("total")}</span>
          <span className="font-heading text-2xl font-bold text-heading">
            {formatUsdt(locale, order.totalUsdtCents)}
          </span>
        </p>
        {order.status === "pagamento_parcial" && order.paidUsdtCents !== null ? (
          <p className="text-sm text-error-text">
            {t("partial", { paid: formatUsdt(locale, order.paidUsdtCents) })}
          </p>
        ) : null}
        <PaymentBox
          status={order.status}
          network={order.network}
          expiresAt={order.expiresAt}
          payUrl={order.payUrl}
          t={t}
        />
        {needsScheduling(order) ? (
          // RN-16 (#94): sem horário fixo — o cliente marca a run com o suporte pelo chat
          <div className="grid gap-3 rounded-md border border-link/30 bg-link/10 p-4 text-sm">
            <p className="font-semibold text-heading">{t("scheduleTitle")}</p>
            <p>{t("scheduleText")}</p>
            <ChatOpenButton
              label={t("scheduleButton")}
              message={t("scheduleMessage", { order: order.id.slice(0, 8) })}
            />
          </div>
        ) : null}
        <DeliveryBox delivery={delivery} t={t} />
      </GradientCard>
    </div>
  );
}
