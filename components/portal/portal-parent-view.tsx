"use client";

import { BarChart3, CalendarCheck, CreditCard, GraduationCap, LogOut, Wallet } from "lucide-react";
import { portalLogoutAction } from "@/app/actions/portal-auth";
import { Button } from "@/components/ui/button";
import type { PortalDashboardData } from "@/services/portal-dashboard";

export function PortalParentView({ data }: { data: PortalDashboardData }) {
  const attendanceCount = data.attendance.filter((row) => row.status === "PRESENT" || row.status === "LATE").length;
  const attendanceRate = data.lessons.length ? Math.round((attendanceCount / data.lessons.length) * 100) : 0;
  const exams = new Map(data.exams.map((exam: any) => [exam.id, exam]));
  const percentages = data.grades.map((grade: any) => { const exam = exams.get(grade.exam_id); return exam?.max_score ? (Number(grade.score || 0) / Number(exam.max_score)) * 100 : 0; });
  const average = percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : 0;
  const due = data.payments.reduce((sum, payment: any) => sum + Math.max(Number(payment.amount_due || 0) - Number(payment.amount_paid || 0), 0), 0);
  const paid = data.payments.reduce((sum, payment: any) => sum + Number(payment.amount_paid || 0), 0);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] bg-gradient-to-br from-sky-700 via-indigo-700 to-slate-900 p-6 shadow-2xl sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-sky-200">MYAcademy · {data.academyName}</p><h1 className="mt-2 text-3xl font-black">بوابة ولي الأمر</h1><p className="mt-2 text-sm text-sky-100">متابعة {data.student.first_name} {data.student.last_name} · {data.parentName || "ولي الأمر"}</p></div><form action={portalLogoutAction}><Button type="submit" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><LogOut className="me-2 h-4 w-4" /> خروج</Button></form></div></header>
        <section className="grid gap-4 sm:grid-cols-4"><Metric icon={<CalendarCheck className="h-5 w-5" />} label="الحضور" value={`${attendanceRate}%`} /><Metric icon={<BarChart3 className="h-5 w-5" />} label="متوسط الدرجات" value={`${average}%`} /><Metric icon={<Wallet className="h-5 w-5" />} label="المدفوع" value={paid.toLocaleString("ar-EG")} /><Metric icon={<CreditCard className="h-5 w-5" />} label="المتبقي" value={due.toLocaleString("ar-EG")} /></section>

        <section className="grid gap-6 lg:grid-cols-2"><Panel title="الأداء الأكاديمي" icon={<GraduationCap className="h-5 w-5" />}><div className="space-y-4">{data.grades.map((grade: any, index) => { const exam = exams.get(grade.exam_id); const percentage = percentages[index] || 0; return <div key={`${grade.exam_id}-${index}`}><div className="flex items-center justify-between gap-3 text-sm"><span>{exam?.name || exam?.title || "تقييم"}</span><strong>{Math.round(percentage)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} /></div></div>; })}{!data.grades.length && <Empty text="لا توجد درجات مسجلة حتى الآن." />}</div></Panel><Panel title="الماليات" icon={<Wallet className="h-5 w-5" />}><div className="space-y-3">{data.payments.map((payment: any) => <div key={payment.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-semibold">استحقاق دراسي</p><p className="mt-1 text-xs text-slate-400">{payment.due_date ? String(payment.due_date).slice(0, 10) : "بدون موعد"}</p></div><div className="text-left text-sm"><p>مدفوع: {Number(payment.amount_paid || 0).toLocaleString("ar-EG")}</p><p className="mt-1 text-amber-300">متبقي: {Math.max(Number(payment.amount_due || 0) - Number(payment.amount_paid || 0), 0).toLocaleString("ar-EG")}</p></div></div>)}{!data.payments.length && <Empty text="لا توجد مدفوعات مسجلة حتى الآن." />}</div></Panel></section>

        <Panel title="ملخص الحضور والحصص" icon={<CalendarCheck className="h-5 w-5" />}><div className="grid gap-3 sm:grid-cols-2">{data.lessons.slice(0, 10).map((lesson: any) => { const row = data.attendance.find((item: any) => item.lesson_id === lesson.id); return <div key={lesson.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div><p className="font-semibold">{lesson.topic || lesson.title || "حصة دراسية"}</p><p className="mt-1 text-xs text-slate-400">{lesson.date || "—"}</p></div><span className="text-xs font-semibold text-slate-300">{row?.status === "PRESENT" ? "حاضر" : row?.status === "LATE" ? "متأخر" : "غير مسجل"}</span></div>; })}{!data.lessons.length && <Empty text="لا توجد حصص مسجلة حتى الآن." />}</div></Panel>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-lg"><div className="flex items-center justify-between text-sky-300">{icon}<span className="text-xl font-black text-white">{value}</span></div><p className="mt-3 text-sm text-slate-400">{label}</p></div>; }
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-xl sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4 text-sky-300"><span>{icon}</span><h2 className="text-xl font-bold text-white">{title}</h2></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-slate-400">{text}</p>; }
