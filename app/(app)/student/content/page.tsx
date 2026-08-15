import Link from "next/link";
import { BookOpen, CheckCircle2, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import { listProgressForStudent } from "@/services/content";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentContentPage() {
  const user = await requireScopedRole("STUDENT");
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const [courses, progress] = await Promise.all([ContentService.listCourses(user), listProgressForStudent(user)]);
  const completed = new Set(progress.map((item) => item.lesson_id));

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={en ? "Educational content" : "المحتوى التعليمي"} description={en ? "Courses and resources shared with your enrolled groups." : "الدورات والموارد المتاحة لمجموعاتك المسجل بها."} />
      {courses.length === 0 ? <EmptyState icon={BookOpen} title={en ? "No content available" : "لا يوجد محتوى متاح"} description={en ? "Your teachers have not published content for your groups yet." : "لم ينشر مدرسوك محتوى لمجموعاتك بعد."} /> : <div className="grid gap-4 md:grid-cols-2">{courses.map((course) => { const total = course.lessons?.length ?? 0; const done = course.lessons?.filter((lesson) => completed.has(lesson.id)).length ?? 0; return <Link key={course.id} href={`/student/content/${course.id}`}><Card className="h-full transition hover:border-primary/50 hover:shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{course.title}</h2><p className="mt-1 text-sm text-muted-foreground">{course.description || (en ? "Course resources" : "موارد الدورة")}</p></div><BookOpen className="h-5 w-5 text-primary" /></div><div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{course.group?.name}</span><span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{total} {en ? "lessons" : "دروس"}</span><Badge variant={total > 0 && done === total ? "success" : "outline"}>{total > 0 && done === total ? <><CheckCircle2 className="me-1 h-3.5 w-3.5" />{en ? "Completed" : "مكتملة"}</> : `${done}/${total}`}</Badge></div></CardContent></Card></Link>; })}</div>}
    </div>
  );
}
