"use client";

import * as React from "react";
import { Loader2, LifeBuoy, Send, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupportTicketAction } from "@/app/actions/support";
import type { SupportTicket, SupportCategory } from "@/services/support";

const categoryLabelsAr: Record<SupportCategory, string> = {
  ONBOARDING: "الإعداد والبدء",
  BILLING: "الاشتراك أو الدفع",
  TECHNICAL: "مشكلة تقنية",
  DATA: "البيانات أو الاستيراد",
  OTHER: "موضوع آخر",
};

const categoryLabelsEn: Record<SupportCategory, string> = {
  ONBOARDING: "Setup and onboarding",
  BILLING: "Subscription or payment",
  TECHNICAL: "Technical issue",
  DATA: "Data or import",
  OTHER: "Other",
};

const statusLabelsAr: Record<SupportTicket["status"], string> = {
  OPEN: "مفتوح",
  IN_PROGRESS: "قيد المتابعة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلق",
};

const statusLabelsEn: Record<SupportTicket["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
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
  en = false,
}: {
  initialTickets: SupportTicket[];
  available: boolean;
  en?: boolean;
}) {
  const categoryLabels = en ? categoryLabelsEn : categoryLabelsAr;
  const statusLabels = en ? statusLabelsEn : statusLabelsAr;
  const [tickets, setTickets] = React.useState(initialTickets);
  const [pending, setPending] = React.useState(false);
  const [category, setCategory] = React.useState<SupportCategory>("ONBOARDING");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!available) {
      toast.error(en ? "The ticket system needs the database connection first." : "نظام التذاكر يحتاج ربط قاعدة البيانات أولًا.");
      return;
    }
    setPending(true);
    try {
      const ticket = await createSupportTicketAction({ category, subject, description });
      setTickets((current) => [ticket, ...current]);
      setSubject("");
      setDescription("");
      setCategory("ONBOARDING");
      toast.success(en ? "Support request sent. You can track its status here." : "تم إرسال طلب الدعم. ستجد حالته هنا.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال طلب الدعم.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" dir={en ? "ltr" : "rtl"}>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-100 p-2.5 text-brand-700"><LifeBuoy className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold">{en ? "Open a support ticket" : "افتح طلب دعم"}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{en ? "Describe the issue without passwords or card details. Your ticket is limited to your academy." : "اشرح المشكلة دون كلمات مرور أو بيانات بطاقات. الطلب مرتبط بأكاديميتك فقط."}</p>
          </div>
        </div>
        {!available ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{en ? "You are currently using preview mode. The help center is available, while support tickets activate after the database is connected and ticket updates are applied." : "أنت تستخدم وضع العرض حاليًا. مركز المساعدة متاح، بينما تذاكر الدعم تُفعّل تلقائيًا بعد ربط قاعدة البيانات وتطبيق تحديث التذاكر."}</div>
        ) : null}
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">{en ? "Request type" : "نوع الطلب"}
            <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)} disabled={!available || pending} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">{en ? "Subject" : "العنوان"}
            <input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={!available || pending} minLength={4} maxLength={140} required placeholder={en ? "Example: I need help importing students" : "مثال: أحتاج مساعدة في استيراد الطلاب"} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block text-sm font-medium">{en ? "Details" : "التفاصيل"}
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!available || pending} minLength={10} maxLength={4000} required rows={6} placeholder={en ? "Describe the steps you took and what appeared, without including a password." : "اذكر الخطوات التي اتبعتها وما ظهر لك، دون إدراج أي كلمة مرور."} className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <Button className="w-full" type="submit" disabled={!available || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {en ? "Send request" : "إرسال الطلب"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{en ? "Your previous requests" : "طلباتك السابقة"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{en ? "Track every request without sharing your data with another academy." : "تابع حالة كل طلب دون مشاركة بياناتك مع أكاديمية أخرى."}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{tickets.length} {en ? "requests" : "طلب"}</span>
        </div>
        {tickets.length === 0 ? (
          <div className="mt-8 grid min-h-52 place-items-center rounded-xl border border-dashed border-border p-6 text-center">
            <div><TicketCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">{en ? "No support requests yet" : "لا توجد طلبات دعم بعد"}</p><p className="mt-1 text-sm text-muted-foreground">{en ? "Use the help center or open your first request when needed." : "يمكنك الاعتماد على مركز المساعدة أو فتح أول طلب عند الحاجة."}</p></div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <article className="rounded-xl border border-border p-4" key={ticket.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{ticket.subject}</h3><p className="mt-1 text-xs text-muted-foreground">{categoryLabels[ticket.category]} · {new Intl.DateTimeFormat(en ? "en-US" : "ar-EG", { dateStyle: "medium" }).format(new Date(ticket.created_at))}</p></div>
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
