"use client";

import { useState } from "react";
import { ArrowLeft, Check, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/services/saas";
import { Button } from "@/components/ui/button";

type BillingCycle = "monthly" | "annual";

const comparisonRows = [
  { label: "إدارة الطلاب والملفات", values: ["حتى 50", "حتى 200", "حتى 750", "حتى 5,000"] },
  { label: "الحضور اليدوي وQR", values: [true, true, true, true] },
  { label: "الدرجات والواجبات", values: [true, true, true, true] },
  { label: "التقارير والتحليلات", values: ["أساسية", "أساسية", "متقدمة", "متقدمة"] },
  { label: "بوابات الأدوار", values: [true, true, true, true] },
  { label: "التخزين", values: ["250 ميجابايت", "2 جيجابايت", "10 جيجابايت", "50 جيجابايت"] },
];

function formatLimit(value: number, suffix: string) {
  return `${value.toLocaleString("ar-EG")} ${suffix}`;
}

function annualPrice(plan: Plan) {
  return plan.price === 0 ? 0 : Math.round(plan.price * 10);
}

export function PricingPlans({ plans, salesWhatsAppUrl }: { plans: Plan[]; salesWhatsAppUrl?: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));
  const cycleSuffix = cycle === "annual" ? " / سنة" : " / شهر";

  return (
    <>
      <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-3">
        <div role="tablist" aria-label="دورة الفوترة" className="grid w-full grid-cols-2 rounded-2xl border border-border/80 bg-muted/50 p-1.5">
          <button type="button" role="tab" aria-selected={cycle === "monthly"} onClick={() => setCycle("monthly")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${cycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            شهري
          </button>
          <button type="button" role="tab" aria-selected={cycle === "annual"} onClick={() => setCycle("annual")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${cycle === "annual" ? "bg-brand-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            سنوي <span className="mr-1 text-[11px] font-semibold opacity-80">شهران مجانًا</span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">يمكنك البدء مجانًا، ثم تغيير الخطة أو دورة الفوترة لاحقًا.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {plans.map((plan) => {
          const isPro = plan.id === "pro";
          const displayedPrice = cycle === "annual" ? annualPrice(plan) : plan.price;
          return (
            <article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5 ${isPro ? "border-brand-500 shadow-lg shadow-brand-900/10 ring-1 ring-brand-500/20" : "border-border/80"}`}>
              {isPro && <span className="absolute -top-3 right-5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">الأكثر اختيارًا</span>}
              <p className="text-sm font-bold text-muted-foreground">{plan.id === "free" ? "للتجربة" : plan.id === "pro" ? "للنمو" : plan.id === "basic" ? "للبداية" : "للتوسع"}</p>
              <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <div className="mt-6 border-b border-border/70 pb-6">
                <span className="text-4xl font-black">{displayedPrice.toLocaleString("ar-EG")}</span>
                <span className="text-sm text-muted-foreground"> جنيه{plan.price === 0 ? "" : cycleSuffix}</span>
                {cycle === "annual" && plan.price > 0 && <p className="mt-2 text-xs font-semibold text-emerald-700">إجمالي سنوي بعد توفير شهرين</p>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStudents, "طالب")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxTeachers, "مدرس")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxGroups, "مجموعة")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxAcademies, "أكاديمية")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStorageMb >= 1024 ? Math.round(plan.maxStorageMb / 1024) : plan.maxStorageMb, plan.maxStorageMb >= 1024 ? "جيجابايت تخزين" : "ميجابايت تخزين")}</li>
              </ul>
              <Button asChild className="mt-8 h-11 w-full rounded-xl" variant={isPro ? "default" : "outline"}><Link href="/signup">ابدأ الآن <ArrowLeft className="h-4 w-4" /></Link></Button>
            </article>
          );
        })}
      </div>

      <div className="mt-14 overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/70 bg-muted/35 px-5 py-5 sm:px-7"><h2 className="text-xl font-black">قارن المزايا قبل اتخاذ القرار</h2><p className="mt-1 text-sm text-muted-foreground">المقارنة تلخص ما تحصل عليه في كل مستوى، بينما تحدد الخطة الفعلية حدود الاستخدام.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead><tr className="border-b border-border/70"><th className="px-5 py-4 font-bold sm:px-7">الميزة</th>{plans.map((plan) => <th key={plan.id} className="px-4 py-4 text-center font-bold">{plan.name}</th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.label} className="border-b border-border/60 last:border-0"><th className="px-5 py-4 font-semibold sm:px-7">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`} className="px-4 py-4 text-center text-muted-foreground">{typeof value === "boolean" ? <Check aria-label="متاح" className="mx-auto h-4 w-4 text-emerald-600" /> : value}</td>)}</tr>)}</tbody></table></div>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3"><MiniTrust title="دون بطاقة ائتمان" text="ابدأ بالخطة المجانية فورًا." /><MiniTrust title="ترقية أو إلغاء واضح" text="اختر دورة الدفع التي تناسبك." /><MiniTrust title="دعم بالعربية" text="نساعدك في الإعداد والنقل." /></div>

      <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-brand-200 bg-brand-50/70 p-7 text-center sm:p-9"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm"><Sparkles className="h-5 w-5" /></div><h2 className="mt-4 text-2xl font-black">هل تحتاج خطة تناسب فروعك؟</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">لخطة المؤسسات، نراجع عدد الفروع والطلاب واحتياجات التقارير معك قبل تقديم عرض مخصص. لا يتم تفعيل الدفع الإلكتروني قبل اكتمال إعداد Paymob أو Stripe والتحقق من Webhook.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild variant="outline" className="h-11 rounded-xl bg-white"><Link href="/signup">أنشئ أكاديميتك مجانًا</Link></Button>{hasSalesWhatsApp ? <Button asChild className="h-11 rounded-xl"><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> اطلب عرضًا مخصصًا</a></Button> : <Button asChild className="h-11 rounded-xl"><a href="mailto:sales@myacademy.eg"><MessageCircle className="h-4 w-4" /> تواصل مع المبيعات</a></Button>}</div></div>
      <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">الأسعار المعروضة تقديرية حسب الخطة ودورة الفوترة. راجع تفاصيل الفاتورة وسياسة الإلغاء قبل الدفع؛ وأي اشتراك مدفوع يعتمد على إعداد بوابة الدفع والتحقق من الحدث الوارد.</p>
    </>
  );
}

function MiniTrust({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-border/80 bg-card p-4 text-center"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>;
}
