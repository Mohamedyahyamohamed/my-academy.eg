import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { AIMentorChat } from "@/components/student/ai-mentor-chat";
import { getAIMentorLogsForStudent } from "@/services/ai-mentor";
import { requireScopedRole } from "@/services";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentAIMentorPage() {
  const user = await requireScopedRole("STUDENT");
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const logs = await getAIMentorLogsForStudent(user);

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "AI Mentor" : "الموجّه الذكي"}
        description={en ? "Learn Python and Computer Science through guided questions." : "تعلّم Python وعلوم الحاسب من خلال أسئلة إرشادية تساعدك على التفكير."}
      />
      <AIMentorChat logs={logs} />
    </div>
  );
}
