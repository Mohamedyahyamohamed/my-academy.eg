import { BookOpen, CheckCircle2, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import { collections } from "@/services/data/store";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ParentContentPage() {
  const user = await requireScopedRole("PARENT");
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const progress = await ContentService.listProgressForParent(user);
  const rows = progress.map((item) => {
    const student = collections().students.find((s) => s.id === item.student_id);
    const lesson = collections().contentLessons.find((l) => l.id === item.lesson_id);
    const course = lesson ? collections().contentCourses.find((c) => c.id === lesson.course_id) : null;
    return { ...item, studentName: item.student_name || student ? `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() : "", lessonTitle: lesson?.title ?? "", courseTitle: course?.title ?? "" };
  });

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={en ? "Content progress" : "تقدم المحتوى"} description={en ? "A read-only view of your children's completed lessons." : "عرض للقراءة فقط للدروس التي أكملها أبناؤك."} />
      {rows.length === 0 ? <EmptyState icon={BookOpen} title={en ? "No completed lessons yet" : "لا توجد دروس مكتملة بعد"} description={en ? "Completed lessons will appear here." : "ستظهر الدروس المكتملة هنا."} /> : <div className="grid gap-3">{rows.map((row) => <Card key={row.id}><CardContent className="flex flex-wrap items-center gap-4 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div className="min-w-0 flex-1"><p className="font-medium">{row.lessonTitle}</p><p className="text-sm text-muted-foreground">{row.studentName} · {row.courseTitle}</p></div><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Date(row.completed_at).toLocaleDateString(en ? "en-US" : "ar-EG")}</span></CardContent></Card>)}</div>}
    </div>
  );
}
