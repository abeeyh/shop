import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/atoms/Button";
import { Countdown } from "@/components/molecules/Countdown";
import type { Network, OrderStatus } from "./rules";

type Props = {
  status: OrderStatus;
  network: Network | null;
  expiresAt: Date;
  payUrl: string | null;
  t: Awaited<ReturnType<typeof getTranslations<"Order">>>;
};

const unixNow = () => Math.floor(Date.now() / 1000);

// RN-37: rede em destaque enquanto o pagamento está em aberto; RN-34: prazo de 30 min
export function PaymentBox({ status, network, expiresAt, payUrl, t }: Props) {
  if (!network || (status !== "pendente" && status !== "pagamento_parcial")) return null;
  // fatura externa (provedor real); no fake a fatura é a própria página do pedido
  const externalPay = payUrl?.startsWith("https://") ? payUrl : null;
  return (
    <div className="grid gap-3 rounded-md border border-primary bg-primary/10 p-4 text-sm">
      <p className="font-semibold text-heading">
        {t("network", { network: network === "trc20" ? "TRC-20" : "ERC-20" })}
      </p>
      {status === "pendente" ? (
        <Countdown until={expiresAt.toISOString()} serverNow={unixNow()} label={t("expiresIn")} />
      ) : null}
      {externalPay ? (
        <a href={externalPay} className={buttonVariants({ variant: "primary" })}>
          {t("pay")}
        </a>
      ) : (
        <p className="text-muted-foreground">{t("waiting")}</p>
      )}
    </div>
  );
}
