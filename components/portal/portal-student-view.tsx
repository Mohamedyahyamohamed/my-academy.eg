"use client";

import { useState } from "react";
import { BookOpen, CalendarCheck, FileUp, GraduationCap, LogOut, UploadCloud } from "lucide-react";
import { portalLogoutAction } from "@/app/actions/portal-auth";
import { Button } from "@/components/ui/button";
import type { PortalDashboardData } from "@/services/portal-dashboard";

export function PortalStudentView({ data }: { data: PortalDashboardData }) {
  const present = data.attendance.filter((row) => row.status === "PRESENT" || row.status === "LATE").length;
  const attendanceRate = data.lessons.length ? Math.round((present / data.lessons.length) * 100) : 0;
  const groupMap = new Map(data.groups.map((group) => [group.id, group.name]));
  const [homework, setHomework] = useState(data.homework);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitHomework(homeworkId: string, form: HTMLFormElement) {
    setBusy(homeworkId); setMessage(null);
    try {
      const response = await fetch(`/api/portal/homework/${encodeURIComponent(homeworkId)}`, { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "تعذر حفظ التسليم.");
      setHomework((items) => items.map((item) => item.id === homeworkId ? { ...item, submission: { ...(item.submission ?? {}), id: payload.submissionId, status: "SUBMITTED", submitted_at: new Date().toISOString() } } : item));
      form.reset(); setMessage("تم إرسال الواجب بنجاح.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إرسال الواجب."); }
    finally { setBusy(null); }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-6 shadow-2xl sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-violet-200">MYAcademy · {data.academyName}</p><h1 className="mt-2 text-3xl font-black">بوابة الطالب</h1><p className="mt-2 text-sm text-violet-100">مرحبًا {data.student.first_name} {data.student.last_name}</p></div>
            <form action={portalLogoutAction}><Button type="submit" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><LogOut className="me-2 h-4 w-4" /> خروج</Button></form>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-violet-200">الصف</p><p className="mt-1 font-bold">{data.student.grade || "غير محدد"}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-violet-200">المجموعات</p><p className="mt-1 font-bold">{data.groups.length}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-violet-200">نسبة الحضور</p><p className="mt-1 font-bold">{attendanceRate}%</p></div></div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="الحصص المسجلة" value={data.lessons.length} />
          <StatCard icon={<GraduationCap className="h-5 w-5" />} label="الحضور والـ late" value={present} />
          <StatCard icon={<UploadCloud className="h-5 w-5" />} label="الواجبات" value={homework.length} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="مجموعاتي" icon={<GraduationCap className="h-5 w-5" />}>
            <div className="space-y-3">{data.groups.map((group) => <div key={group.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="font-semibold">{group.name}</p></div>)}{!data.groups.length && <Empty text="لا توجد مجموعات مسجلة حتى الآن." />}</div>
          </Panel>
          <Panel title="الحصص والحضور" icon={<CalendarCheck className="h-5 w-5" />}>
            <div className="space-y-3">{data.lessons.slice(0, 8).map((lesson: any) => { const attendance = data.attendance.find((row: any) => row.lesson_id === lesson.id); return <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-semibold">{lesson.topic || lesson.title || "حصة دراسية"}</p><p className="mt-1 text-xs text-slate-400">{lesson.date || "—"} · {groupMap.get(lesson.group_id) || "مجموعة"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attendance?.status === "PRESENT" ? "bg-emerald-400/15 text-emerald-300" : attendance?.status === "LATE" ? "bg-amber-400/15 text-amber-300" : "bg-slate-700 text-slate-300"}`}>{attendance?.status === "PRESENT" ? "حاضر" : attendance?.status === "LATE" ? "متأخر" : "غير مسجل"}</span></div>; })}{!data.lessons.length && <Empty text="لا توجد حصص حتى الآن." />}</div>
          </Panel>
        </section>

        <Panel title="المحتوى التعليمي" icon={<BookOpen className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">{data.contentFiles.map((file: any) => <a key={file.id} href={`/api/portal/content/${encodeURIComponent(file.id)}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-violet-400/50 hover:bg-white/[0.08]"><FileUp className="h-5 w-5 shrink-0 text-violet-300" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{file.name}</span><span className="mt-1 block text-xs text-slate-400">{file.course_title}</span></span></a>)}{!data.contentFiles.length && <Empty text="لا توجد مواد منشورة حتى الآن." />}</div>
        </Panel>

        <Panel title="الواجبات والتسليم" icon={<UploadCloud className="h-5 w-5" />}>
          <div className="space-y-4">{homework.map((item: any) => <form key={item.id} onSubmit={(event) => { event.preventDefault(); void submitHomework(item.id, event.currentTarget); }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-xs text-slate-400">{item.group_name} · الموعد: {item.deadline ? String(item.deadline).slice(0, 10) : "غير محدد"}</p>{item.description && <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.submission?.status === "SUBMITTED" || item.submission?.status === "REVIEWED" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{item.submission?.status === "REVIEWED" ? "تمت المراجعة" : item.submission?.status === "SUBMITTED" ? "تم التسليم" : "مطلوب"}</span></div><textarea name="content" rows={3} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-100 outline-none focus:border-violet-400" placeholder="اكتب إجابتك أو ملاحظتك" /><div className="mt-3 flex flex-wrap items-center gap-2"><input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="min-w-0 flex-1 text-xs text-slate-300" /><Button type="submit" size="sm" disabled={busy === item.id}>{busy === item.id ? "جارٍ الإرسال..." : "إرسال الواجب"}</Button></div></form>)}{message && <p role="status" className="rounded-xl bg-violet-400/10 p-3 text-sm text-violet-200">{message}</p>}{!homework.length && <Empty text="لا توجد واجبات مسندة حتى الآن." />}</div>
        </Panel>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) { return <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-lg"><div className="flex items-center justify-between text-violet-300">{icon}<span className="text-2xl font-black text-white">{value}</span></div><p className="mt-3 text-sm text-slate-400">{label}</p></div>; }
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4 text-violet-300"><span>{icon}</span><h2 className="text-xl font-bold text-white">{title}</h2></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-slate-400">{text}</p>; }
