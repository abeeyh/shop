import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";

type Props = {
  delivery: { proofUrl: string; note: string } | null;
  t: Awaited<ReturnType<typeof getTranslations<"Order">>>;
};

// RN-52: o cliente vê a prova da entrega no pedido concluído
export function DeliveryBox({ delivery, t }: Props) {
  if (!delivery) return null;
  return (
    <div className="grid gap-1 rounded-md border border-primary bg-primary/10 p-4 text-sm">
      <p className="font-semibold text-heading">{t("delivered")}</p>
      <a href={delivery.proofUrl} rel="noopener noreferrer" className="text-link hover:underline">
        {t("proof")}
      </a>
      {delivery.note ? <p className="whitespace-pre-line">{delivery.note}</p> : null}
    </div>
  );
}
