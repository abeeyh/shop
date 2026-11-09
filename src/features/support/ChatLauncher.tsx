import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";
import { getCustomer } from "@/features/account/session";
import { currentConversationId } from "./access";
import { getConversation } from "./chat";
import { isOpen, nextOpening } from "./hours";
import { listHours } from "./hours-queries";
import { customerCanReply } from "./rules";
import { ChatWidget } from "./components/ChatWidget";

// RN-92: chat em todas as páginas da loja; a conversa do visitante vem do cookie (só o servidor lê)
export async function ChatLauncher({ locale }: { locale: string }) {
  // online/offline depende da hora da requisição (RN-99) e o banco não existe no build da imagem
  await connection();
  const [t, current, hours, timeZone, customer] = await Promise.all([
    getTranslations({ locale, namespace: "Chat" }),
    currentConversationId(), // #162: logado, a conversa da conta (em qualquer aparelho)
    listHours(),
    getTimezone(),
    getCustomer(),
  ]);
  // RN-93: resolvida há mais de 7 dias → oferece conversa nova
  const conversation = current ? await getConversation(current) : null;
  const id = conversation && customerCanReply(conversation) ? conversation.id : null;
  const online = isOpen(hours); // RN-99
  const backAt = online ? null : (nextOpening(hours)?.toISOString() ?? null);
  return (
    <ChatWidget
      locale={locale}
      timeLocale={canonicalLocale(locale)}
      initialId={id}
      online={online}
      backAt={backAt}
      timeZone={timeZone}
      accountEmail={customer?.email ?? null}
      labels={{
        open: t("open"),
        close: t("close"),
        title: t("title"),
        notice: t("notice"),
        email: t("email"),
        name: t("name"),
        message: t("message"),
        start: t("start"),
        offlineTitle: t("offlineTitle"),
        offlineStart: t("offlineStart"),
        backAt: t("backAt"),
        you: t("you"),
        team: t("team"),
        placeholder: t("placeholder"),
        send: t("send"),
        errors: { error: t("errors.error"), limited: t("errors.limited"), closed: t("errors.closed") },
      }}
    />
  );
}
