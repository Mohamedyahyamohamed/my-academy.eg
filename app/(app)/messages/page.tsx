import { MessagesPageContent } from "@/components/messages/messages-page";
import { getInbox, getSentMessages, getContacts } from "@/services/messaging";
import { requireScopedRole } from "@/services";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MessagesRoute() {
  const user = await requireScopedRole("ADMIN", "TEACHER", "PARENT");
  const inbox = getInbox(user);
  const sent = getSentMessages(user);
  const contacts = getContacts(user);

  return (
    <div className="space-y-6">
      <PageHeader title="الرسائل" description="تواصل مع المدرّسين وأولياء الأمور." />
      {contacts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="لا توجد جهات اتصال بعد" description="ستظهر جهات الاتصال بعد إنشاء المستخدمين." />
      ) : (
        <MessagesPageContent inbox={inbox} sent={sent} contacts={contacts as any} />
      )}
    </div>
  );
}
