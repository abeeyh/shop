import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { getConversation, guestConversationId } from "./chat";
import { customerCanReply } from "./rules";
import { ChatWidget } from "./components/ChatWidget";

// RN-92: chat em todas as páginas da loja; a conversa do visitante vem do cookie (só o servidor lê)
export async function ChatLauncher({ locale }: { locale: string }) {
  const [t, current] = await Promise.all([
    getTranslations({ locale, namespace: "Chat" }),
    guestConversationId(),
  ]);
  // RN-93: resolvida há mais de 7 dias → oferece conversa nova
  const conversation = current ? await getConversation(current) : null;
  const id = conversation && customerCanReply(conversation) ? conversation.id : null;
  return (
    <ChatWidget
      locale={locale}
      initialId={id}
      labels={{
        open: t("open"),
        close: t("close"),
        title: t("title"),
        notice: t("notice"),
        email: t("email"),
        name: t("name"),
        message: t("message"),
        start: t("start"),
        you: t("you"),
        team: t("team"),
        placeholder: t("placeholder"),
        send: t("send"),
        errors: { error: t("errors.error"), limited: t("errors.limited"), closed: t("errors.closed") },
      }}
    />
  );
}
