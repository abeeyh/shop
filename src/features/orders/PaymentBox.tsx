import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/atoms/Button";
import { Countdown } from "@/components/molecules/Countdown";
import { ChatOpenButton } from "@/features/support";
import { payOrder } from "./actions";
import { OrderActionForm } from "./components/OrderActionForm";
import type { Network, OrderStatus } from "./rules";

type Props = {
  order: {
    id: string;
    status: OrderStatus;
    network: Network | null;
    expiresAt: Date;
    payUrl: string | null;
  };
  locale: string;
  token: string;
  t: Awaited<ReturnType<typeof getTranslations<"Order">>>;
};

const unixNow = () => Math.floor(Date.now() / 1000);
const OPEN: OrderStatus[] = ["solicitado", "aguardando_pagamento", "pagamento_parcial"];

// RN-37: rede em destaque enquanto o pagamento está em aberto; RN-34: prazo de 2 h.
// #170: "Pagar" sai de solicitado; sem gateway, o suporte confirma o pagamento (chat).
export function PaymentBox({ order, locale, token, t }: Props) {
  const { status, network } = order;
  if (!network || !OPEN.includes(status)) return null;
  // só fatura https do provedor vira botão
  const externalPay = order.payUrl?.startsWith("https://") ? order.payUrl : null;
  return (
    <div className="grid gap-3 rounded-md border border-primary bg-primary/10 p-4 text-sm">
      <p className="font-semibold text-heading">
        {t("network", { network: network === "trc20" ? "TRC-20" : "ERC-20" })}
      </p>
      {status !== "pagamento_parcial" ? (
        <Countdown until={order.expiresAt.toISOString()} serverNow={unixNow()} label={t("expiresIn")} />
      ) : null}
      {status === "solicitado" ? (
        <OrderActionForm
          action={payOrder}
          locale={locale}
          id={order.id}
          token={token}
          label={t("payNow")}
          errors={{ payment: t("errors.payment"), stale: t("errors.stale") }}
        />
      ) : externalPay ? (
        <a href={externalPay} className={buttonVariants({ variant: "primary" })}>
          {t("pay")}
        </a>
      ) : (
        <>
          <p>{t(status === "pagamento_parcial" ? "partialReview" : "manualPayment")}</p>
          <ChatOpenButton
            label={t("paymentChat")}
            message={t("paymentMessage", { order: order.id.slice(0, 8) })}
          />
        </>
      )}
    </div>
  );
}
