import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { guestConversationId } from "./chat";
import { ChatWidget } from "./components/ChatWidget";

// RN-92: chat em todas as páginas da loja; a conversa do visitante vem do cookie (só o servidor lê)
export async function ChatLauncher({ locale }: { locale: string }) {
  const [t, id] = await Promise.all([getTranslations({ locale, namespace: "Chat" }), guestConversationId()]);
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
