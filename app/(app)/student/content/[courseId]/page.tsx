import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, ExternalLink, FileText, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireScopedRole } from "@/services/session";
import * as ContentService from "@/services/content";
import { MarkCompleteButton } from "@/components/content/content-forms";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function StudentCoursePage({ params }: PageProps) {
  const user = await requireScopedRole("STUDENT");
  const { courseId } = await params;
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const course = await ContentService.getCourse(courseId, user);
  if (!course) return <div dir={en ? "ltr" : "rtl"} className="rounded-xl border p-8 text-center">{en ? "Course not found or unavailable." : "الدورة غير موجودة أو غير متاحة لك."}</div>;
  const lessons = course.lessons ?? [];
  const done = lessons.filter((lesson) => lesson.completed).length;

  return (
    <div dir={en ? "ltr" : "rtl"} className="space-y-6">
      <PageHeader title={course.title} description={course.description || (en ? "Course lessons and resources." : "دروس وموارد الدورة.")} />
      <div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href="/student/content"><ArrowRight className="me-1 h-4 w-4" />{en ? "All content" : "كل المحتوى"}</Link></Button><Badge variant="outline">{course.group?.name}</Badge><Badge variant="success">{done}/{lessons.length} {en ? "completed" : "مكتمل"}</Badge></div>
      {(course.files?.length ?? 0) > 0 || (course.links?.length ?? 0) > 0 ? <Card><CardHeader><CardTitle>{en ? "Course resources" : "موارد الكورس"}</CardTitle></CardHeader><CardContent className="space-y-2">{course.files?.map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" />{file.name}<Download className="ms-auto h-3.5 w-3.5" /></a>)}{course.links?.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" />{link.title}<ExternalLink className="ms-auto h-3.5 w-3.5" /></a>)}</CardContent></Card> : null}
      <Card><CardHeader><CardTitle>{en ? "Lessons" : "الدروس"}</CardTitle></CardHeader><CardContent className="space-y-3">{lessons.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No published lessons yet." : "لا توجد دروس منشورة بعد."}</p> : lessons.map((lesson) => <div key={lesson.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2">{lesson.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <PlayCircle className="h-4 w-4 text-primary" />}<h3 className="font-medium">{lesson.title}</h3></div><p className="mt-1 text-sm text-muted-foreground">{lesson.description || (en ? "Lesson resources" : "موارد الدرس")}</p></div><MarkCompleteButton lessonId={lesson.id} courseId={course.id} completed={lesson.completed} /></div><StudentLessonFiles courseId={course.id} lessonId={lesson.id} user={user} en={en} /></div>)}</CardContent></Card>
    </div>
  );
}

async function StudentLessonFiles({ courseId, lessonId, user, en }: { courseId: string; lessonId: string; user: any; en: boolean }) {
  const files = await ContentService.listContentFiles(courseId, user, lessonId);
  const links = await ContentService.listContentLinks(courseId, user, lessonId);
  if (files.length === 0 && links.length === 0) return null;
  return <div className="mt-3 space-y-2 border-t pt-3">{files.map((file) => <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" />{file.name}<Download className="ms-auto h-3.5 w-3.5" /></a>)}{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" />{link.title}<ExternalLink className="ms-auto h-3.5 w-3.5" /></a>)}</div>;
}
