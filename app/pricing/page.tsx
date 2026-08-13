import Link from "next/link";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { listPlans } from "@/services/saas";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";

function formatLimit(value: number, suffix: string) {
  return `${value.toLocaleString("ar-EG")} ${suffix}`;
}

export default function PricingPage() {
  const plans = listPlans();
  const salesWhatsAppUrl = process.env.NEXT_PUBLIC_WHATSAPP_SALES_URL?.trim();
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));
  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/login">تسجيل الدخول</Link></Button>
            <Button asChild size="sm"><Link href="/signup">ابدأ مجانًا</Link></Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">أسعار بسيطة وواضحة</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">اختار الخطة المناسبة لأكاديميتك</h1>
          <p className="mt-4 text-muted-foreground">ابدأ مجانًا، ثم وسّع خطتك مع نمو عدد الطلاب والمدرسين.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.id} className={`flex flex-col rounded-2xl border bg-card p-6 ${plan.id === "pro" ? "border-brand-500 shadow-lg ring-1 ring-brand-500/20" : "border-border"}`}>
              {plan.id === "pro" && <span className="mb-4 self-start rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">الأكثر اختيارًا</span>}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5"><span className="text-3xl font-bold">{plan.price.toLocaleString("ar-EG")}</span><span className="text-sm text-muted-foreground"> جنيه / شهر</span></div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStudents, "طالب")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxTeachers, "مدرس")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxGroups, "مجموعة")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxAcademies, "أكاديمية")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStorageMb >= 1024 ? Math.round(plan.maxStorageMb / 1024) : plan.maxStorageMb, plan.maxStorageMb >= 1024 ? "جيجابايت تخزين" : "ميجابايت تخزين")}</li>
              </ul>
              <Button asChild className="mt-7 w-full" variant={plan.id === "pro" ? "default" : "outline"}>
                <Link href="/signup">ابدأ الآن <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-brand-200 bg-brand-50/60 p-6 text-center">
          <h2 className="text-xl font-bold">هل تحتاج مساعدة في اختيار الخطة أو نقل بياناتك؟</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">ابدأ بالخطة المجانية في أي وقت، أو اطلب تجربة موجهة لتتعرف على الإعداد والاستيراد قبل اتخاذ قرار الاشتراك.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline"><Link href="/signup">أنشئ أكاديميتك مجانًا</Link></Button>
            {hasSalesWhatsApp ? (
              <Button asChild><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> اطلب تجربة موجهة</a></Button>
            ) : null}
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">الأسعار شهرية بالجنيه المصري. تفعيل الدفع الإلكتروني يحتاج إعداد Paymob أو Stripe والتحقق من Webhook قبل تحصيل أي اشتراك.</p>
      </section>
    </main>
  );
}
