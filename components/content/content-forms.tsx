"use client";

import { useClientLang } from "@/lib/i18n-client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createContentCourseAction, createContentLessonAction, markLessonCompleteAction, uploadContentFile, addContentLink } from "@/app/actions/content";

export function CreateCourseForm({ groups }: { groups: Array<{ id: string; name: string }> }) {
  const lang = useClientLang();
  const en = lang === "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const result = await createContentCourseAction(formData);
        if (!result?.ok) toast.error(en ? "Could not create the course." : "تعذر إنشاء الكورس.");
        else { toast.success(en ? "Course created successfully." : "تم إنشاء الكورس بنجاح."); form.reset(); router.refresh(); }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : (en ? "Could not create the course." : "تعذر إنشاء الكورس."));
      }
    });
  };
  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget); }} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{en ? "Create a course" : "إنشاء دورة"}</h2>
      <div className="space-y-1"><Label htmlFor="course-title">{en ? "Title" : "عنوان الدورة"}</Label><Input id="course-title" name="title" required placeholder={en ? "Algebra foundations" : "أساسيات الجبر"} /></div>
      <div className="space-y-1"><Label htmlFor="course-description">{en ? "Description" : "الوصف"}</Label><Textarea id="course-description" name="description" rows={3} /></div>
      <div className="space-y-1"><Label htmlFor="course-group">{en ? "Teaching group" : "المجموعة"}</Label><select id="course-group" name="groupId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" />{en ? "Publish immediately" : "نشر الدورة فورًا"}</label>
      <Button type="submit" disabled={pending || groups.length === 0}>{pending ? (en ? "Creating…" : "جارٍ الإنشاء…") : (en ? "Create course" : "إنشاء الدورة")}</Button>
      {groups.length === 0 && <p className="text-xs text-amber-600">{en ? "Create or assign a teaching group before adding a course." : "أنشئ أو اربط مجموعة تدريس قبل إضافة كورس."}</p>}
    </form>
  );
}

export function CreateLessonForm({ courseId }: { courseId: string }) {
  const lang = useClientLang();
  const en = lang === "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const formData = new FormData(form); startTransition(async () => { try { const result = await createContentLessonAction(formData); if (!result?.ok) toast.error(en ? "Could not add the lesson." : "تعذر إضافة المحاضرة."); else { toast.success(en ? "Lesson added." : "تمت إضافة المحاضرة."); form.reset(); router.refresh(); } } catch (error) { toast.error(error instanceof Error ? error.message : (en ? "Could not add the lesson." : "تعذر إضافة المحاضرة.")); } }); }} className="space-y-3 rounded-xl border bg-card p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <h2 className="font-semibold">{en ? "Add a lesson" : "إضافة درس"}</h2>
      <div className="space-y-1"><Label htmlFor="lesson-title">{en ? "Lesson title" : "عنوان الدرس"}</Label><Input id="lesson-title" name="title" required /></div>
      <div className="space-y-1"><Label htmlFor="lesson-description">{en ? "Description" : "الوصف"}</Label><Textarea id="lesson-description" name="description" rows={3} /></div>
      <div className="space-y-1"><Label htmlFor="lesson-video">{en ? "Video URL (optional)" : "رابط الفيديو (اختياري)"}</Label><Input id="lesson-video" name="videoUrl" type="url" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" />{en ? "Publish immediately" : "نشر الدرس فورًا"}</label>
      <Button type="submit" disabled={pending}>{pending ? (en ? "Adding…" : "جارٍ الإضافة…") : (en ? "Add lesson" : "إضافة الدرس")}</Button>
    </form>
  );
}

type LessonOption = { id: string; title: string };

export function UploadContentFileForm({ courseId, lessonId, lessons = [] }: { courseId: string; lessonId?: string; lessons?: LessonOption[] }) {
  const lang = useClientLang();
  const en = lang === "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const formData = new FormData(form); startTransition(async () => { try { const result = await uploadContentFile(formData); if (!result?.ok) toast.error(result?.error || (en ? "Upload failed." : "فشل رفع الملف.")); else { toast.success(en ? "File uploaded." : "تم رفع الملف."); form.reset(); router.refresh(); } } catch (error) { toast.error(error instanceof Error ? error.message : (en ? "Upload failed." : "فشل رفع الملف.")); } }); }} className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <input type="hidden" name="courseId" value={courseId} />
      {lessons.length > 0 ? <div className="min-w-[220px] flex-1 space-y-1"><Label htmlFor={`content-file-lesson-${courseId}`}>{en ? "Attach to" : "إرفاق إلى"}</Label><select id={`content-file-lesson-${courseId}`} name="lessonId" defaultValue={lessonId ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">{en ? "Course overview" : "الكورس بالكامل"}</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></div> : lessonId ? <input type="hidden" name="lessonId" value={lessonId} /> : null}
      <div className="min-w-[220px] flex-1 space-y-1"><Label htmlFor={`content-file-${lessonId ?? "course"}`}>{en ? "File" : "الملف"}</Label><Input id={`content-file-${lessonId ?? "course"}`} name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.mp4" required /></div>
      <p className="w-full text-xs text-muted-foreground">{en ? "PDF, DOCX, images, or MP4 up to 500 MB." : "PDF أو DOCX أو صور أو MP4 حتى 500 ميجابايت."}</p><Button type="submit" variant="soft" disabled={pending}>{pending ? (en ? "Uploading…" : "جارٍ الرفع…") : (en ? "Upload file" : "رفع الملف")}</Button>
    </form>
  );
}

export function AddContentLinkForm({ courseId, lessonId, lessons = [] }: { courseId: string; lessonId?: string; lessons?: LessonOption[] }) {
  const lang = useClientLang();
  const en = lang === "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const formData = new FormData(form); startTransition(async () => { try { const result = await addContentLink(formData); if (!result?.ok) toast.error(result?.error || (en ? "Could not add the link." : "تعذر إضافة الرابط.")); else { toast.success(en ? "Link added." : "تمت إضافة الرابط."); form.reset(); router.refresh(); } } catch (error) { toast.error(error instanceof Error ? error.message : (en ? "Could not add the link." : "تعذر إضافة الرابط.")); } }); }} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
      <input type="hidden" name="courseId" value={courseId} />
      {lessons.length > 0 ? <div className="space-y-1"><Label htmlFor={`content-link-lesson-${courseId}`}>{en ? "Attach to" : "إرفاق إلى"}</Label><select id={`content-link-lesson-${courseId}`} name="lessonId" defaultValue={lessonId ?? ""} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">{en ? "Course overview" : "الكورس بالكامل"}</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></div> : lessonId ? <input type="hidden" name="lessonId" value={lessonId} /> : null}
      <div className="space-y-1"><Label htmlFor={`content-link-title-${lessonId ?? "course"}`}>{en ? "Resource title" : "اسم الرابط"}</Label><Input id={`content-link-title-${lessonId ?? "course"}`} name="title" required placeholder={en ? "Lecture link" : "رابط المحاضرة"} /></div>
      <div className="space-y-1"><Label htmlFor={`content-link-url-${lessonId ?? "course"}`}>{en ? "URL" : "الرابط"}</Label><Input id={`content-link-url-${lessonId ?? "course"}`} name="url" type="url" required placeholder="https://..." /></div>
      <Button type="submit" variant="soft" disabled={pending}>{pending ? (en ? "Saving…" : "جارٍ الحفظ…") : (en ? "Add link" : "إضافة الرابط")}</Button>
    </form>
  );
}

export function MarkCompleteButton({ lessonId, courseId, completed }: { lessonId: string; courseId: string; completed?: boolean }) {
  const lang = useClientLang();
  const en = lang === "en";
  if (completed) return <span className="text-sm font-medium text-emerald-600">{en ? "Completed" : "مكتمل"}</span>;
  return <form action={async (formData) => { await markLessonCompleteAction(formData); }}><input type="hidden" name="lessonId" value={lessonId} /><input type="hidden" name="courseId" value={courseId} /><Button type="submit" size="sm">{en ? "Mark complete" : "تحديد كمكتمل"}</Button></form>;
}
