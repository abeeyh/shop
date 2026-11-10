import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { GradientCard } from "@/components/molecules/GradientCard";
import { formatUsdt } from "@/features/catalog";
import { DeliveryBox, getOrder, isOrderToken, needsScheduling, PaymentBox } from "@/features/orders";
import { askRefund } from "@/features/orders/actions";
import { OrderActionForm } from "@/features/orders/components/OrderActionForm";
import { canRequestRefund, type OrderStatus } from "@/features/orders/rules";
import { ChatOpenButton } from "@/features/support";

// #100: combinação e adicionais comprados (o personagem não aparece: o link pode ser compartilhado)
function chosen(options: unknown): string {
  const o = (options ?? {}) as { variant?: unknown; addons?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return [...list(o.variant), ...list(o.addons)].join(" · ");
}
import { getDelivery } from "@/features/orders/staff";

export const instant = false;

const DELIVERED: OrderStatus[] = ["concluido_parcial", "concluido"];
// #170: aviso ao cliente nos estados que pedem explicação (falha de pagamento = feedback obrigatório)
const NOTICE: Partial<Record<OrderStatus, "failedNotice" | "refundNotice" | "cancelledNotice">> = {
  falha_pagamento: "failedNotice",
  reembolso_solicitado: "refundNotice",
  cancelado: "cancelledNotice",
};

// Dono do pedido = quem tem o link assinado; senão 404
async function ownedOrder(id: string, token: string) {
  const order = z.uuid().safeParse(id).success && isOrderToken(id, token) ? await getOrder(id) : null;
  if (!order) notFound();
  return order;
}

type OT = Awaited<ReturnType<typeof getTranslations<"Order">>>;

function StatusNotice({ status, t }: { status: OrderStatus; t: OT }) {
  const key = NOTICE[status];
  if (!key) return null;
  const tone =
    status === "falha_pagamento"
      ? "border-destructive/50 bg-destructive/10 text-error-text"
      : "border-border bg-secondary";
  return (
    <p role="status" className={`rounded-md border p-4 text-sm ${tone}`}>
      {t(key)}
    </p>
  );
}

function RefundRequest({ locale, id, token, t }: { locale: string; id: string; token: string; t: OT }) {
  return (
    <div className="border-t border-border pt-4">
      <OrderActionForm
        action={askRefund}
        locale={locale}
        id={id}
        token={token}
        label={t("refund.button")}
        errors={{ payment: t("errors.payment"), stale: t("errors.stale") }}
        confirm={{
          title: t("refund.title"),
          message: t("refund.message"),
          confirm: t("refund.confirm"),
          cancel: t("refund.cancel"),
        }}
      />
    </div>
  );
}

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
  const tk = typeof token === "string" ? token : "";
  const order = await ownedOrder(id, tk);
  const [t, delivery] = await Promise.all([
    getTranslations({ locale, namespace: "Order" }),
    DELIVERED.includes(order.status) ? getDelivery(order.id) : null, // RN-52
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
              <span>
                {i.productName}
                {chosen(i.options) ? (
                  <span className="block text-xs text-muted-foreground">{chosen(i.options)}</span>
                ) : null}
              </span>
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
        <StatusNotice status={order.status} t={t} />
        <PaymentBox order={order} locale={locale} token={tk} t={t} />
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
        {canRequestRefund(order.status) ? (
          <RefundRequest locale={locale} id={order.id} token={tk} t={t} />
        ) : null}
      </GradientCard>
    </div>
  );
}
