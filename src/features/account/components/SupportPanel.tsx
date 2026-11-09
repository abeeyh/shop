import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { currentConversationId } from "@/features/support/access";
import { listAccountConversations } from "@/features/support/chat";
import { sendChatMessage } from "@/features/support/chat-actions";
import { ChatOpenButton } from "@/features/support/components/ChatOpenButton";
import { ChatThread } from "@/features/support/components/ChatThread";

const TONE = { aberta: "warning", em_atendimento: "info", resolvida: "success" } as const;

// #162 (RN-92): chat direto com o suporte no perfil — a conversa é da conta (vale em qualquer aparelho).
// Sem conversa ativa, o botão abre o chat flutuante já com o e-mail da conta.
export async function SupportPanel({
  locale,
  userId,
  timeZone,
}: {
  locale: string;
  userId: string;
  timeZone: string | null;
}) {
  const [t, chat, admin, format, current, history] = await Promise.all([
    getTranslations({ locale, namespace: "Account" }),
    getTranslations({ locale, namespace: "Chat" }),
    getTranslations({ locale, namespace: "Admin" }),
    getFormatter({ locale }),
    currentConversationId(),
    listAccountConversations(userId),
  ]);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{chat("notice")}</p>
      {current ? (
        <ChatThread
          conversationId={current}
          viewer="customer"
          action={sendChatMessage}
          labels={{
            you: chat("you"),
            team: chat("team"),
            placeholder: chat("placeholder"),
            send: chat("send"),
            errors: {
              error: chat("errors.error"),
              limited: chat("errors.limited"),
              closed: chat("errors.closed"),
            },
          }}
        />
      ) : (
        <div>
          <ChatOpenButton label={t("support.start")} message="" />
        </div>
      )}
      {history.length ? (
        <section aria-labelledby="historico-suporte" className="grid gap-2">
          <h3 id="historico-suporte" className="text-sm font-semibold text-foreground">
            {t("support.history")}
          </h3>
          <ul className="grid gap-1.5 text-sm">
            {history.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span>
                  {format.dateTime(c.createdAt, { dateStyle: "medium", timeZone: timeZone ?? undefined })}
                </span>
                <StatusBadge tone={TONE[c.status]}>{admin(`support.statuses.${c.status}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
