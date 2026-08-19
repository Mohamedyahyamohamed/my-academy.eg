import { MessagesPageContent } from "@/components/messages/messages-page";
import { getInbox, getSentMessages, getContacts } from "@/services/messaging";
import { requireScopedRole } from "@/services";
import { PageHeader } from "@/components/shared/page-header";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MessagesRoute() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN", "TEACHER", "PARENT");
  const [inbox, sent, contacts] = await Promise.all([
    getInbox(user),
    getSentMessages(user),
    getContacts(user),
  ]);

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Messages" : "الرسائل"} description={en ? "Communicate with teachers and parents." : "تواصل مع المدرّسين وأولياء الأمور."} />
      <MessagesPageContent inbox={inbox} sent={sent} contacts={contacts as any} />
    </div>
  );
}
