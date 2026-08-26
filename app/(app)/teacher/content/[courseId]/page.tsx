import { ArrowRight, BookOpen, ExternalLink, FileText, Video } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { AddContentLinkForm, CreateLessonForm, UploadContentFileForm } from "@/components/content/content-forms";
import { DeleteContentFileButton, DeleteContentLessonButton } from "@/components/content/content-delete-buttons";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function TeacherCoursePage({ params }: PageProps) {
  const user = await requireScopedRole("TEACHER");
  const { courseId } = await params;
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const course = await ContentService.getCourse(courseId, user);
  if (!course) return <div dir={en ? "ltr" : "rtl"} className="rounded-xl border p-8 text-center">{en ? "Course not found or outside your scope." : "الدورة غير موجودة أو خارج نطاقك."}</div>;

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={course.title} description={course.description || (en ? "Manage lessons and course files." : "إدارة الدروس وملفات الدورة.")} />
      <div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href="/teacher/content"><ArrowRight className="me-1 h-4 w-4" />{en ? "All courses" : "كل الدورات"}</Link></Button><Badge variant="outline">{course.group?.name}</Badge><Badge variant={course.is_published ? "success" : "secondary"}>{course.is_published ? (en ? "Published" : "منشورة") : (en ? "Draft" : "مسودة")}</Badge></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle>{en ? "Lessons" : "الدروس"}</CardTitle><span className="text-sm text-muted-foreground">{course.lessons?.length ?? 0}</span></CardHeader>
          <CardContent className="space-y-4">
            <UploadContentFileForm courseId={course.id} lessons={course.lessons ?? []} />
            <AddContentLinkForm courseId={course.id} lessons={course.lessons ?? []} />
            {(course.files?.length ?? 0) > 0 && <div className="rounded-lg border p-3"><p className="mb-2 text-sm font-medium">{en ? "Course files" : "ملفات الدورة"}</p>{course.files?.map((file) => <div key={file.id} className="flex items-center gap-2"><a href={file.download_url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span></a><DeleteContentFileButton fileId={file.id} fileName={file.name} /></div>)}</div>}
            {(course.links?.length ?? 0) > 0 && <div className="rounded-lg border p-3"><p className="mb-2 text-sm font-medium">{en ? "Course links" : "روابط الدورة"}</p>{course.links?.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" />{link.title}</a>)}</div>}
            {course.lessons?.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No lessons yet." : "لا توجد دروس بعد."}</p> : course.lessons?.map((lesson) => (
              <div key={lesson.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><Link href={`/teacher/content/${course.id}/lessons/${lesson.id}`} className="min-w-0 flex-1"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h3 className="truncate font-medium hover:underline">{lesson.title}</h3></div><p className="mt-1 text-sm text-muted-foreground">{lesson.description || (en ? "No description" : "بدون وصف")}</p></Link><div className="flex shrink-0 items-center gap-2"><Badge variant={lesson.is_published ? "success" : "secondary"}>{lesson.is_published ? (en ? "Published" : "منشور") : (en ? "Draft" : "مسودة")}</Badge><DeleteContentLessonButton courseId={course.id} lessonId={lesson.id} lessonTitle={lesson.title} /></div></div><div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">{lesson.video_url && <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />{en ? "Video" : "فيديو"}</span>}<span>{en ? "Open details to add files and links" : "افتح التفاصيل لإضافة الملفات والروابط"}</span></div></div>
            ))}
          </CardContent>
        </Card>
        <CreateLessonForm courseId={course.id} />
      </div>
    </div>
  );
}
