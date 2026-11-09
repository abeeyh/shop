import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ConfirmSubmit } from "@/components/molecules/ConfirmSubmit";
import { GradientCard } from "@/components/molecules/GradientCard";
import { PageHeader } from "@/components/molecules/PageHeader";
import { formatUsdt } from "@/features/catalog";
import { listOrdersByEmail } from "@/features/orders/staff";
import { ORDER_STATUS_TONE } from "@/features/orders/status-tone";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { requireStaff } from "@/features/auth/staff";
import { getConversation } from "@/features/support/chat";
import { staffReply, staffSetStatus } from "@/features/support/chat-actions";
import { ChatThread } from "@/features/support/components/ChatThread";
import { maskEmail } from "@/lib/logger";

export const instant = false;

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;
type OT = Awaited<ReturnType<typeof getTranslations<"Order">>>;
type Status = "aberta" | "em_atendimento" | "resolvida";
const TONE = { aberta: "warning", em_atendimento: "info", resolvida: "success" } as const;
const NEXT = { aberta: "em_atendimento", em_atendimento: "resolvida", resolvida: null } as const;

// RN-93 + RF-05: selo do status e o próximo passo (assumir → resolver) com confirmação
function StatusAction({ status, locale, id, t }: { status: Status; locale: string; id: string; t: T }) {
  const next = NEXT[status];
  const step = next === "em_atendimento" ? "assume" : "resolve";
  return (
    <>
      <span data-testid="conversation-status">
        <StatusBadge tone={TONE[status]}>{t(`support.statuses.${status}`)}</StatusBadge>
      </span>
      {next ? (
        <form action={staffSetStatus}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={next} />
          <ConfirmSubmit
            label={t(`support.${step}`)}
            title={t(`support.${step}`)}
            message={t(`support.confirm.${step}`)}
            confirmLabel={t("confirm.ok")}
            cancelLabel={t("confirm.cancel")}
          />
        </form>
      ) : null}
    </>
  );
}

// RF-24: pedidos do mesmo e-mail (sem mostrar o e-mail — RN-06)
function CustomerOrders(p: {
  orders: Awaited<ReturnType<typeof listOrdersByEmail>>;
  locale: string;
  t: T;
  o: OT;
}) {
  return (
    <aside
      aria-labelledby="pedidos-cliente"
      className="grid gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 id="pedidos-cliente" className="font-heading font-bold text-heading">
        {p.t("support.customerOrders")}
      </h2>
      {p.orders.length ? (
        <ul className="grid gap-2 text-sm">
          {p.orders.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/${p.locale}/admin/pedidos/${r.id}`}
                className="font-mono text-link hover:underline"
              >
                {r.id.slice(0, 8)}
              </Link>
              <StatusBadge tone={ORDER_STATUS_TONE[r.status]}>{p.o(`statuses.${r.status}`)}</StatusBadge>
              <span className="w-full text-xs text-muted-foreground">
                {formatUsdt(p.locale, r.totalUsdtCents)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{p.t("support.noOrders")}</p>
      )}
    </aside>
  );
}

// RN-93: assumir, responder e resolver; mensagens em tempo real pelo SSE
export default async function SupportConversation({ params }: PageProps<"/[locale]/admin/suporte/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const c = z.uuid().safeParse(id).success ? await getConversation(id) : null;
  if (!c) notFound();
  const [t, chat, o, orders] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Chat" }),
    getTranslations({ locale, namespace: "Order" }),
    listOrdersByEmail(c.guestEmail), // RF-24: pedidos do cliente ao lado da conversa
  ]);
  return (
    <>
      <PageHeader
        title={c.guestName ?? t("support.customer")}
        description={`${staff.role === "admin" ? c.guestEmail : maskEmail(c.guestEmail)} · ${LOCALE_LABELS[c.locale] ?? c.locale}`}
        back={
          <Link
            href={`/${locale}/admin/suporte`}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-link hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("support.back")}
          </Link>
        }
        actions={<StatusAction status={c.status} locale={locale} id={c.id} t={t} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <GradientCard tone="solid">
          <ChatThread
            conversationId={c.id}
            viewer="staff"
            action={staffReply}
            hidden={{ locale, id: c.id }}
            labels={{
              you: t("support.you"),
              team: t("support.customer"),
              placeholder: chat("placeholder"),
              send: chat("send"),
              errors: {
                error: chat("errors.error"),
                limited: chat("errors.limited"),
                closed: chat("errors.closed"),
              },
            }}
          />
        </GradientCard>
        <CustomerOrders orders={orders} locale={locale} t={t} o={o} />
      </div>
    </>
  );
}
