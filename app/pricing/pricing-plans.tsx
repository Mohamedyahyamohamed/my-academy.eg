"use client";

import { useState } from "react";
import { ArrowLeft, Check, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/services/saas";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";

type BillingCycle = "monthly" | "annual";

function annualPrice(plan: Plan) {
  return plan.price === 0 ? 0 : Math.round(plan.price * 10);
}

export function PricingPlans({ plans, salesWhatsAppUrl }: { plans: Plan[]; salesWhatsAppUrl?: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const lang = useClientLang();
  const en = lang === "en";
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));
  const teacherPlans = plans.filter((plan) => plan.audience === "TEACHER");
  const academyPlans = plans.filter((plan) => plan.audience === "ACADEMY");

  return (
    <>
      <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-3">
        <div role="tablist" aria-label={en ? "Billing cycle" : "دورة الفوترة"} className="grid w-full grid-cols-2 rounded-2xl border border-border/80 bg-muted/50 p-1.5">
          <button type="button" role="tab" aria-selected={cycle === "monthly"} onClick={() => setCycle("monthly")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${cycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {en ? "Monthly" : "شهري"}
          </button>
          <button type="button" role="tab" aria-selected={cycle === "annual"} onClick={() => setCycle("annual")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${cycle === "annual" ? "bg-brand-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {en ? "Annual" : "سنوي"} <span className="mr-1 text-[11px] font-semibold opacity-80">{en ? "2 months free" : "شهران مجانًا"}</span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">{en ? "Start free, then change your plan or billing cycle whenever you need." : "يمكنك البدء مجانًا، ثم تغيير الخطة أو دورة الفوترة لاحقًا."}</p>
      </div>

      <PricingSection plans={teacherPlans} cycle={cycle} en={en} kind="teacher" />
      <PricingSection plans={academyPlans} cycle={cycle} en={en} kind="academy" />

      <div className="mt-14 overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/70 bg-muted/35 px-5 py-5 sm:px-7">
          <h2 className="text-xl font-black">{en ? "Which plan type is right for you?" : "أي نوع من الخطط يناسبك؟"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{en ? "Teacher plans are sized for one independent teacher. Academy plans are designed for teams, groups and multiple teachers." : "خطط المدرسين مصممة لمدرس مستقل، بينما خطط الأكاديميات مصممة للفرق والمجموعات والمدرسين المتعددين."}</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
            <h3 className="font-bold">{en ? "Independent teacher" : "مدرس مستقل"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{en ? "One teacher workspace with student-focused limits, simple groups and no team-management overhead." : "مساحة مدرس واحدة بحدود تركز على عدد الطلاب والمجموعات دون تكاليف إدارة فريق."}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/25 p-5">
            <h3 className="font-bold">{en ? "Academy" : "أكاديمية"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{en ? "A full academy workspace for multiple teachers, larger rosters, groups, branches and administration." : "مساحة أكاديمية كاملة لعدة مدرسين، وعدد طلاب أكبر، ومجموعات وفروع وإدارة مركزية."}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        <MiniTrust title={en ? "No credit card" : "دون بطاقة ائتمان"} text={en ? "Start with the free plan." : "ابدأ بالخطة المجانية فورًا."} />
        <MiniTrust title={en ? "Clear upgrades" : "ترقية واضحة"} text={en ? "Choose the limits that fit your workspace." : "اختر الحدود المناسبة لمساحتك."} />
        <MiniTrust title={en ? "Arabic support" : "دعم بالعربية"} text={en ? "We can help with setup and migration." : "نساعدك في الإعداد والنقل."} />
      </div>

      <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-brand-200 bg-brand-50/70 p-7 text-center sm:p-9">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm"><Sparkles className="h-5 w-5" /></div>
        <h2 className="mt-4 text-2xl font-black">{en ? "Need a custom academy plan?" : "هل تحتاج خطة أكاديمية مخصصة؟"}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{en ? "For branches and larger organizations, we review student counts, teachers and reporting needs before preparing a custom offer." : "للفروع والمؤسسات الأكبر، نراجع عدد الطلاب والمدرسين واحتياجات التقارير قبل تقديم عرض مخصص."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="h-11 rounded-xl bg-white"><Link href="/signup">{en ? "Create your workspace" : "أنشئ مساحتك مجانًا"}</Link></Button>
          {hasSalesWhatsApp ? <Button asChild className="h-11 rounded-xl"><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> {en ? "Request a quote" : "اطلب عرضًا مخصصًا"}</a></Button> : <Button asChild className="h-11 rounded-xl"><Link href="/support"><MessageCircle className="h-4 w-4" /> {en ? "Contact support" : "تواصل مع الدعم"}</Link></Button>}
        </div>
      </div>
      <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">{en ? "Prices are monthly EGP estimates unless otherwise stated. Final paid-plan activation depends on payment-provider and webhook configuration." : "الأسعار المعروضة تقديرية بالجنيه المصري شهريًا ما لم يذكر غير ذلك. تفعيل الاشتراك المدفوع يعتمد على إعداد بوابة الدفع والتحقق من Webhook."}</p>
    </>
  );
}

function PricingSection({ plans, cycle, en, kind }: { plans: Plan[]; cycle: BillingCycle; en: boolean; kind: "teacher" | "academy" }) {
  const title = kind === "teacher" ? (en ? "Plans for independent teachers" : "خطط المدرسين المستقلين") : (en ? "Plans for academies" : "خطط الأكاديميات");
  const subtitle = kind === "teacher" ? (en ? "Student-focused limits for one teacher workspace." : "حدود تركز على الطلاب لمساحة مدرس واحدة.") : (en ? "Team-focused limits for academies and education centers." : "حدود تركز على الفرق للأكاديميات والمراكز التعليمية.");
  return (
    <section className="mb-14" aria-labelledby={`${kind}-plans-heading`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h2 id={`${kind}-plans-heading`} className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>
        <Link href={`/signup?workspace=${kind === "teacher" ? "teacher" : "academy"}`} className="text-sm font-bold text-brand-700 hover:underline">{en ? `Start as ${kind === "teacher" ? "a teacher" : "an academy"}` : kind === "teacher" ? "ابدأ كمدرس" : "ابدأ كأكاديمية"}</Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => <PlanCard key={plan.id} plan={plan} cycle={cycle} en={en} kind={kind} />)}
      </div>
    </section>
  );
}

function PlanCard({ plan, cycle, en, kind }: { plan: Plan; cycle: BillingCycle; en: boolean; kind: "teacher" | "academy" }) {
  const isFeatured = plan.id === "pro" || plan.id === "teacher_pro";
  const displayedPrice = cycle === "annual" ? annualPrice(plan) : plan.price;
  const storageLabel = plan.maxStorageMb >= 1024 ? `${Math.round(plan.maxStorageMb / 1024)} ${en ? "GB storage" : "جيجابايت تخزين"}` : `${plan.maxStorageMb} ${en ? "MB storage" : "ميجابايت تخزين"}`;
  return (
    <article className={`relative flex flex-col rounded-2xl border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5 ${isFeatured ? "border-brand-500 shadow-lg shadow-brand-900/10 ring-1 ring-brand-500/20" : "border-border/80"}`}>
      {isFeatured && <span className="absolute -top-3 right-5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">{en ? "Most popular" : "الأكثر اختيارًا"}</span>}
      <p className="text-sm font-bold text-muted-foreground">{kind === "teacher" ? (en ? "Teacher workspace" : "مساحة مدرس") : (en ? "Academy workspace" : "مساحة أكاديمية")}</p>
      <h3 className="mt-2 text-2xl font-black">{en ? plan.nameEn : plan.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{en ? plan.descriptionEn : plan.description}</p>
      <div className="mt-6 border-b border-border/70 pb-6"><span className="text-4xl font-black">{displayedPrice.toLocaleString(en ? "en-GB" : "ar-EG")}</span><span className="text-sm text-muted-foreground"> {en ? (plan.price === 0 ? "EGP" : cycle === "annual" ? "EGP / year" : "EGP / month") : `جنيه${plan.price === 0 ? "" : cycle === "annual" ? " / سنة" : " / شهر"}`}</span>{cycle === "annual" && plan.price > 0 && <p className="mt-2 text-xs font-semibold text-emerald-700">{en ? "Annual price includes two free months" : "إجمالي سنوي بعد توفير شهرين"}</p>}</div>
      <ul className="mt-6 flex-1 space-y-3 text-sm leading-6">
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{en ? `Up to ${plan.maxStudents.toLocaleString("en-GB")} students` : `حتى ${plan.maxStudents.toLocaleString("ar-EG")} طالب`}</li>
        {kind === "academy" && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{en ? `Up to ${plan.maxTeachers.toLocaleString("en-GB")} teachers` : `حتى ${plan.maxTeachers.toLocaleString("ar-EG")} مدرس`}</li>}
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{en ? `Up to ${plan.maxGroups.toLocaleString("en-GB")} groups` : `حتى ${plan.maxGroups.toLocaleString("ar-EG")} مجموعة`}</li>
        {kind === "academy" && <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{en ? `Up to ${plan.maxAcademies.toLocaleString("en-GB")} branches` : `حتى ${plan.maxAcademies.toLocaleString("ar-EG")} فرع`}</li>}
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{storageLabel}</li>
      </ul>
      <Button asChild className="mt-8 h-11 w-full rounded-xl" variant={isFeatured ? "default" : "outline"}><Link href={`/signup?workspace=${kind === "teacher" ? "teacher" : "academy"}`}>{en ? "Start now" : "ابدأ الآن"} <ArrowLeft className="h-4 w-4" /></Link></Button>
    </article>
  );
}

function MiniTrust({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-border/80 bg-card p-4 text-center"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>;
}
