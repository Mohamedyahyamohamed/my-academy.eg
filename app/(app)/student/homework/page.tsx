import { cookies } from "next/headers";
import { ClipboardList, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { HomeworkBadge } from "@/components/shared/badges";
import { SubmitHomework } from "@/components/homework/submit-homework";
import { resolveStudent, HomeworkService, requireScopedRole } from "@/services";
import { formatDate } from "@/lib/utils";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentHomeworkPage() {
  const user = await requireScopedRole("STUDENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const student = resolveStudent(user);
  const homework = student ? await HomeworkService.homeworkForStudent(student.id, user.academy_id) : [];

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Homework" : "الواجبات"} description={en ? "Your assignments. Submit your work before the deadline." : "واجباتك. سلّم شغلك قبل الموعد النهائي."} />
      {homework.length === 0 ? (
        <EmptyState icon={ClipboardList} title={en ? "No homework" : "لا توجد واجبات"} description={en ? "No assignments are currently assigned to you." : "لا توجد واجبات مسندة إليك حاليًا."} />
      ) : (
        <div className="space-y-3">
          {homework.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{s.homework?.title}</p>
                      <HomeworkBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.homework?.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {s.homework?.group?.name} · {en ? "Due:" : "موعد التسليم:"} {formatDate(s.homework?.deadline)}
                    </p>
                    {s.content && (
                      <p className="mt-2 rounded-md bg-muted p-2 text-xs">
                        <span className="font-medium">{en ? "Your submission:" : "تسليمك:"}</span> {s.content}
                      </p>
                    )}
                    {s.file_url && (
                      <a href={s.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Paperclip className="h-3.5 w-3.5" /> {en ? "View attachment" : "عرض الملف المرفق"}
                      </a>
                    )}
                    {s.feedback && (
                      <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-800">
                        <span className="font-medium">{en ? "Teacher feedback:" : "ملاحظات المعلّم:"}</span> {s.feedback}
                        {s.grade != null && <> · {en ? "Grade:" : "الدرجة:"} {s.grade}/10</>}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <SubmitHomework
                      homeworkId={s.homework_id}
                      studentId={student?.id ?? ""}
                      disabled={s.status !== "PENDING"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
