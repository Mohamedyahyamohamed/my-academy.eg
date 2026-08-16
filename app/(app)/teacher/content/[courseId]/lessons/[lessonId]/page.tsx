import { ArrowRight, ExternalLink, FileText, Video } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import { AddContentLinkForm, UploadContentFileForm } from "@/components/content/content-forms";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = { params: { courseId: string; lessonId: string } };

export default async function TeacherLessonPage({ params }: PageProps) {
  const user = await requireScopedRole("TEACHER");
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const course = await ContentService.getCourse(params.courseId, user);
  const lesson = course?.lessons?.find((item) => item.id === params.lessonId);
  if (!course || !lesson) return <div dir={en ? "ltr" : "rtl"} className="rounded-xl border p-8 text-center">{en ? "Lesson not found." : "الدرس غير موجود."}</div>;
  const files = await ContentService.listContentFiles(course.id, user, lesson.id);
  const links = await ContentService.listContentLinks(course.id, user, lesson.id);

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={lesson.title} description={lesson.description || (en ? "Lesson details and resources." : "تفاصيل الدرس وموارده.")} />
      <Button asChild variant="ghost" size="sm"><Link href={`/teacher/content/${course.id}`}><ArrowRight className="me-1 h-4 w-4" />{en ? "Back to course" : "العودة للدورة"}</Link></Button>
      <Card><CardHeader><CardTitle>{en ? "Resources" : "المصادر"}</CardTitle></CardHeader><CardContent className="space-y-4"><UploadContentFileForm courseId={course.id} lessonId={lesson.id} /><AddContentLinkForm courseId={course.id} lessonId={lesson.id} />{lesson.video_url && <a href={lesson.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Video className="h-4 w-4" />{en ? "Open lesson video" : "فتح فيديو الدرس"}</a>}{files.length === 0 && links.length === 0 ? <p className="py-6 text-sm text-muted-foreground">{en ? "No resources attached yet." : "لا توجد موارد مرفقة بعد."}</p> : <>{files.map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent"><FileText className="h-4 w-4 text-primary" />{file.name}<span className="ms-auto text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</span></a>)}{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 text-sm text-primary hover:bg-accent"><ExternalLink className="h-4 w-4" />{link.title}</a>)}</>}</CardContent></Card>
    </div>
  );
}
