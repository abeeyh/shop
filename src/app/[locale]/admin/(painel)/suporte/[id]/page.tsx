import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { buttonVariants } from "@/components/atoms/Button";
import { GradientCard } from "@/components/molecules/GradientCard";
import { requireStaff } from "@/features/auth/staff";
import { getConversation } from "@/features/support/chat";
import { staffReply, staffSetStatus } from "@/features/support/chat-actions";
import { ChatThread } from "@/features/support/components/ChatThread";
import { maskEmail } from "@/lib/logger";

export const instant = false;

// RN-93: assumir, responder e resolver; mensagens em tempo real pelo SSE
export default async function SupportConversation({ params }: PageProps<"/[locale]/admin/suporte/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const c = z.uuid().safeParse(id).success ? await getConversation(id) : null;
  if (!c) notFound();
  const [t, chat] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Chat" }),
  ]);
  const next = c.status === "aberta" ? "em_atendimento" : c.status === "em_atendimento" ? "resolvida" : null;
  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">
        {c.guestName ?? t("support.customer")}{" "}
        <span className="text-base font-normal text-muted-foreground">
          {staff.role === "admin" ? c.guestEmail : maskEmail(c.guestEmail)} · {c.locale}
        </span>
      </h1>
      <p className="flex flex-wrap items-center gap-3 text-sm">
        <span data-testid="conversation-status">{t(`support.statuses.${c.status}`)}</span>
        {next ? (
          <form action={staffSetStatus}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="status" value={next} />
            <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t(next === "em_atendimento" ? "support.assume" : "support.resolve")}
            </button>
          </form>
        ) : null}
      </p>
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
    </>
  );
}
