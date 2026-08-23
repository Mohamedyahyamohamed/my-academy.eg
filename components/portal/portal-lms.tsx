"use client";

import * as React from "react";
import { BookOpen, CheckCircle2, Download, FileUp, Loader2, UploadCloud } from "lucide-react";
import type { StudentPortalHomework, StudentPortalMaterial } from "@/services/portals";

export function PortalLms({ token, materials, homework }: { token: string; materials: StudentPortalMaterial[]; homework: StudentPortalHomework[] }) {
  const [items, setItems] = React.useState(homework);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const submit = async (homeworkId: string, form: HTMLFormElement) => {
    setBusy(homeworkId); setMessage(null);
    try {
      const response = await fetch(`/api/portal/${encodeURIComponent(token)}/homework/${homeworkId}`, { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "تعذّر حفظ التسليم.");
      setItems((current) => current.map((item) => item.id === homeworkId ? { ...item, status: "SUBMITTED", submittedAt: new Date().toISOString(), submissionId: payload.submissionId } : item));
      form.reset(); setMessage("تم إرسال الواجب بنجاح.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذّر إرسال الواجب."); }
    finally { setBusy(null); }
  };
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700"><BookOpen className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-indigo-700">المذكرات والملفات</p><h2 className="text-2xl font-bold">مواد الدراسة</h2></div></div>
        <div className="mt-5 space-y-3">
          {materials.map((material) => <a key={material.id} href={material.downloadUrl} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"><FileUp className="h-5 w-5 shrink-0 text-indigo-600" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{material.name}</span><span className="block text-xs text-slate-500">{material.courseTitle || "مادة دراسية"} · {Math.max(1, Math.round(material.size / 1024))} KB</span></span><Download className="h-4 w-4 text-slate-400" /></a>)}
          {!materials.length && <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد مذكرات منشورة حتى الآن.</p>}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><UploadCloud className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-amber-700">المهام الدراسية</p><h2 className="text-2xl font-bold">الواجبات والتسليم</h2></div></div>
        <div className="mt-5 space-y-4">
          {items.map((item) => <form key={item.id} onSubmit={(event) => { event.preventDefault(); void submit(item.id, event.currentTarget); }} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.groupName} · آخر موعد: {item.deadline ? new Date(item.deadline).toLocaleDateString("ar-EG") : "غير محدد"}</p>{item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "SUBMITTED" || item.status === "REVIEWED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "REVIEWED" ? "تمت المراجعة" : item.status === "SUBMITTED" ? "تم التسليم" : "مطلوب"}</span></div>{(item.feedback || item.grade != null) && <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">{item.grade != null && <p className="font-semibold">الدرجة: {item.grade}</p>}{item.feedback && <p className="mt-1">{item.feedback}</p>}</div>}<textarea name="content" rows={2} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" placeholder="اكتب إجابتك أو ملاحظتك" /><div className="mt-3 flex flex-wrap items-center gap-2"><input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="block min-w-0 flex-1 text-xs" /><button type="submit" disabled={busy === item.id} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} إعادة التسليم</button></div></form>)}
          {!items.length && <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد واجبات مسندة حتى الآن.</p>}
          {message && <p className="rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-800">{message}</p>}
        </div>
      </div>
    </section>
  );
}
