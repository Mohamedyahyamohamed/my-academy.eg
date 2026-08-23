import Link from "next/link";
import { BookOpen, FileText, Plus, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import * as GroupsService from "@/services/groups";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { CreateCourseForm } from "@/components/content/content-forms";

export const dynamic = "force-dynamic";

export default async function TeacherContentPage() {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const [courses, groups] = await Promise.all([
    ContentService.listCourses(user),
    GroupsService.listGroups("", user.academy_id, user.id),
  ]);
  const groupOptions = groups.map((group) => ({ id: group.id, name: group.name }));

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={en ? "Educational content" : "المحتوى التعليمي"} description={en ? "Create courses and share lessons and files with each teaching group." : "أنشئ دورات وشارك الدروس والملفات مع كل مجموعة تدريسية."} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><BookOpen className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{courses.length}</p><p className="text-xs text-muted-foreground">{en ? "Courses" : "الدورات"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><UsersRound className="h-5 w-5 text-sky-600" /><div><p className="text-2xl font-bold">{groups.length}</p><p className="text-xs text-muted-foreground">{en ? "Teaching groups" : "المجموعات"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><FileText className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-bold">{courses.reduce((sum, course) => sum + (course.lessons?.length ?? 0), 0)}</p><p className="text-xs text-muted-foreground">{en ? "Lessons in view" : "الدروس"}</p></div></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>{en ? "My courses" : "دوراتي"}</CardTitle><Button asChild size="sm" variant="ghost"><Link href="#create-course"><Plus className="me-1 h-4 w-4" />{en ? "New course" : "دورة جديدة"}</Link></Button></CardHeader>
          <CardContent className="space-y-3">
            {courses.length === 0 ? <EmptyState icon={BookOpen} title={en ? "No courses yet" : "لا توجد دورات بعد"} description={en ? "Create your first course for one of your groups." : "أنشئ أول دورة لإحدى مجموعاتك."} /> : courses.map((course) => (
              <Link key={course.id} href={`/teacher/content/${course.id}`} className="block rounded-xl border p-4 transition hover:border-primary/50 hover:bg-accent/30">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{course.title}</h3><p className="mt-1 text-sm text-muted-foreground">{course.description || (en ? "No description" : "بدون وصف")}</p></div><Badge variant={course.is_published ? "success" : "secondary"}>{course.is_published ? (en ? "Published" : "منشورة") : (en ? "Draft" : "مسودة")}</Badge></div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span>{course.group?.name}</span><span>{en ? "Open course" : "فتح الدورة"}</span></div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <div id="create-course"><CreateCourseForm groups={groupOptions} /></div>
      </div>
    </div>
  );
}
