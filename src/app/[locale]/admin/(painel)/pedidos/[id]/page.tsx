import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Input, Textarea } from "@/components/atoms/Input";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { GradientCard } from "@/components/molecules/GradientCard";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { Field } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { describeItem } from "@/features/cart/describe";
import { formatUsdt } from "@/features/catalog";
import { nextStaffStep } from "@/features/orders/rules";
import { getOrderForStaff, orderTimeline } from "@/features/orders/staff";
import { ORDER_STATUS_TONE } from "@/features/orders/status-tone";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";
import { advance } from "@/features/orders/staff-actions";
import type { ItemOptions } from "@/features/pricing/rules";
import { maskEmail } from "@/lib/logger";

export const instant = false;

// RN-06: suporte não vê hash completo nem e-mail completo; admin vê tudo
const shortHash = (h: string | null) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "—");

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;
type OT = Awaited<ReturnType<typeof getTranslations<"Order">>>;

// RF-22: linha do tempo — criado + cada passo da equipe (auditoria, RN-07)
function Timeline(p: {
  created: Date;
  events: Awaited<ReturnType<typeof orderTimeline>>;
  t: T;
  o: OT;
  when: (d: Date) => React.ReactNode;
}) {
  const { created, events, t, o, when } = p;
  return (
    <section aria-labelledby="historico" className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <h2 id="historico" className="font-heading font-bold text-heading">
        {t("orders.timeline")}
      </h2>
      <ol className="grid gap-3 border-l border-border pl-4 text-sm">
        <li>
          <p className="font-semibold text-heading">{t("orders.created")}</p>
          <p className="text-xs text-muted-foreground">{when(created)}</p>
        </li>
        {events.map((e, i) => (
          <li key={i}>
            <p className="font-semibold text-heading">{e.status ? o(`statuses.${e.status}`) : "—"}</p>
            <p className="text-xs text-muted-foreground">
              {e.who} · {when(e.at)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// RN-50/RN-52 + RF-05: próximo passo da entrega, com confirmação (concluir exige a prova)
function StepForm({ step, locale, id, t }: { step: "start" | "complete"; locale: string; id: string; t: T }) {
  return (
    <GradientCard tone="solid" className="grid gap-4">
      <ActionForm
        action={advance}
        locale={locale}
        id={id}
        submit={t(step === "start" ? "orders.start" : "orders.complete")}
        confirm={{
          title: t(step === "start" ? "orders.start" : "orders.complete"),
          message: t(step === "start" ? "orders.confirmStart" : "orders.confirmComplete"),
          confirm: t("confirm.ok"),
          cancel: t("confirm.cancel"),
        }}
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
  );
}

export default async function OrderAdmin({ params }: PageProps<"/[locale]/admin/pedidos/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const order = z.uuid().safeParse(id).success ? await getOrderForStaff(id) : null;
  if (!order) notFound();
  const [t, o, c, timeZone, timeline] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Order" }),
    getTranslations({ locale, namespace: "Cart" }),
    getTimezone(),
    orderTimeline(order.id),
  ]);
  const lang = canonicalLocale(locale);
  const when = (d: Date) => <LocalTime iso={d.toISOString()} locale={lang} timeZone={timeZone} />;
  const admin = staff.role === "admin";
  const step = nextStaffStep(order.status);
  const row = "flex flex-wrap justify-between gap-2 text-sm";

  return (
    <>
      <PageHeader
        title={`${t("orders.order")} ${order.id.slice(0, 8)}`}
        back={
          <Link
            href={`/${locale}/admin/pedidos`}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-link hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("orders.back")}
          </Link>
        }
        actions={
          <span data-testid="staff-order-status">
            <StatusBadge tone={ORDER_STATUS_TONE[order.status]}>{o(`statuses.${order.status}`)}</StatusBadge>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <GradientCard tone="solid" className="grid gap-3">
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
              <a
                href={order.delivery.proofUrl}
                rel="noopener noreferrer"
                className="text-link hover:underline"
              >
                {order.delivery.proofUrl}
              </a>
            </p>
          ) : null}
        </GradientCard>

        <Timeline created={order.createdAt} events={timeline} t={t} o={o} when={when} />
      </div>

      {step ? <StepForm step={step} locale={locale} id={order.id} t={t} /> : null}
    </>
  );
}
