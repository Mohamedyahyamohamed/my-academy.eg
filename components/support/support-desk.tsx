"use client";

import * as React from "react";
import { Loader2, LifeBuoy, Send, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupportTicketAction } from "@/app/actions/support";
import type { SupportTicket, SupportCategory } from "@/services/support";

const categoryLabels: Record<SupportCategory, string> = {
  ONBOARDING: "الإعداد والبدء",
  BILLING: "الاشتراك أو الدفع",
  TECHNICAL: "مشكلة تقنية",
  DATA: "البيانات أو الاستيراد",
  OTHER: "موضوع آخر",
};

const statusLabels: Record<SupportTicket["status"], string> = {
  OPEN: "مفتوح",
  IN_PROGRESS: "قيد المتابعة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلق",
};

const statusClasses: Record<SupportTicket["status"], string> = {
  OPEN: "bg-sky-100 text-sky-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-100 text-slate-700",
};

export function SupportDesk({
  initialTickets,
  available,
}: {
  initialTickets: SupportTicket[];
  available: boolean;
}) {
  const [tickets, setTickets] = React.useState(initialTickets);
  const [pending, setPending] = React.useState(false);
  const [category, setCategory] = React.useState<SupportCategory>("ONBOARDING");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!available) {
      toast.error("نظام التذاكر يحتاج ربط قاعدة البيانات أولًا.");
      return;
    }
    setPending(true);
    try {
      const ticket = await createSupportTicketAction({ category, subject, description });
      setTickets((current) => [ticket, ...current]);
      setSubject("");
      setDescription("");
      setCategory("ONBOARDING");
      toast.success("تم إرسال طلب الدعم. ستجد حالته هنا.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال طلب الدعم.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" dir="rtl">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-100 p-2.5 text-brand-700"><LifeBuoy className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold">افتح طلب دعم</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">اشرح المشكلة دون كلمات مرور أو بيانات بطاقات. الطلب مرتبط بأكاديميتك فقط.</p>
          </div>
        </div>
        {!available ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">أنت تستخدم وضع العرض حاليًا. مركز المساعدة متاح، بينما تذاكر الدعم تُفعّل تلقائيًا بعد ربط قاعدة البيانات وتطبيق تحديث التذاكر.</div>
        ) : null}
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">نوع الطلب
            <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)} disabled={!available || pending} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">العنوان
            <input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={!available || pending} minLength={4} maxLength={140} required placeholder="مثال: أحتاج مساعدة في استيراد الطلاب" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block text-sm font-medium">التفاصيل
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!available || pending} minLength={10} maxLength={4000} required rows={6} placeholder="اذكر الخطوات التي اتبعتها وما ظهر لك، دون إدراج أي كلمة مرور." className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <Button className="w-full" type="submit" disabled={!available || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال الطلب
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">طلباتك السابقة</h2>
            <p className="mt-1 text-sm text-muted-foreground">تابع حالة كل طلب دون مشاركة بياناتك مع أكاديمية أخرى.</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{tickets.length} طلب</span>
        </div>
        {tickets.length === 0 ? (
          <div className="mt-8 grid min-h-52 place-items-center rounded-xl border border-dashed border-border p-6 text-center">
            <div><TicketCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">لا توجد طلبات دعم بعد</p><p className="mt-1 text-sm text-muted-foreground">يمكنك الاعتماد على مركز المساعدة أو فتح أول طلب عند الحاجة.</p></div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <article className="rounded-xl border border-border p-4" key={ticket.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{ticket.subject}</h3><p className="mt-1 text-xs text-muted-foreground">{categoryLabels[ticket.category]} · {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(ticket.created_at))}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[ticket.status]}`}>{statusLabels[ticket.status]}</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{ticket.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
