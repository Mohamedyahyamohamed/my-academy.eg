import Link from "next/link";
import { ArrowLeft, Check, MessageCircle, Sparkles } from "lucide-react";
import { listPlans } from "@/services/saas";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
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
    <main dir="rtl" className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">الرئيسية</Link>
            <a href="#plans" className="rounded-full bg-muted px-4 py-2 text-foreground">الأسعار</a>
            <Link href="/#features" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">المزايا</Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2"><LanguageToggle /><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">تسجيل الدخول</Link></Button><Button asChild size="sm"><Link href="/signup">ابدأ مجانًا <ArrowLeft className="h-4 w-4" /></Link></Button></div>
        </div>
      </header>

      <section className="relative isolate border-b border-border/60 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute -right-32 -top-44 h-[30rem] w-[30rem] rounded-full bg-brand-200/35 blur-3xl" /><div className="absolute -bottom-56 left-0 h-[25rem] w-[25rem] rounded-full bg-sky-100/70 blur-3xl" /></div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700"><Sparkles className="h-3.5 w-3.5" /> خطط مرنة تناسب مرحلة أكاديميتك</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">ابدأ مجانًا، وتوسّع بثقة</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">اختر الخطة التي تناسب عدد طلابك اليوم. يمكنك الترقية لاحقًا دون تغيير طريقة عمل فريقك.</p></div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => {
            const isPro = plan.id === "pro";
            return <article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5 ${isPro ? "border-brand-500 shadow-lg shadow-brand-900/10 ring-1 ring-brand-500/20" : "border-border/80"}`}>
              {isPro && <span className="absolute -top-3 right-5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">الأكثر اختيارًا</span>}
              <p className="text-sm font-bold text-muted-foreground">{plan.id === "free" ? "للتجربة" : plan.id === "pro" ? "للنمو" : plan.id === "basic" ? "للبداية" : "للتوسع"}</p>
              <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <div className="mt-6 border-b border-border/70 pb-6"><span className="text-4xl font-black">{plan.price.toLocaleString("ar-EG")}</span><span className="text-sm text-muted-foreground"> جنيه / شهر</span></div>
              <ul className="mt-6 flex-1 space-y-3 text-sm leading-6"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStudents, "طالب")}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxTeachers, "مدرس")}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxGroups, "مجموعة")}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxAcademies, "أكاديمية")}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{formatLimit(plan.maxStorageMb >= 1024 ? Math.round(plan.maxStorageMb / 1024) : plan.maxStorageMb, plan.maxStorageMb >= 1024 ? "جيجابايت تخزين" : "ميجابايت تخزين")}</li></ul>
              <Button asChild className="mt-8 h-11 w-full rounded-xl" variant={isPro ? "default" : "outline"}><Link href="/signup">ابدأ الآن <ArrowLeft className="h-4 w-4" /></Link></Button>
            </article>;
          })}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3"><MiniTrust title="دون بطاقة ائتمان" text="ابدأ بالخطة المجانية فورًا." /><MiniTrust title="ترقية في أي وقت" text="خطتك تكبر مع أكاديميتك." /><MiniTrust title="دعم بالعربية" text="نساعدك في الإعداد والنقل." /></div>

        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-brand-200 bg-brand-50/70 p-7 text-center sm:p-9"><h2 className="text-2xl font-black">هل تحتاج مساعدة في الاختيار؟</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">ابدأ بالخطة المجانية، أو اطلب تجربة موجهة لتتعرف على الإعداد واستيراد البيانات قبل اتخاذ قرار الاشتراك.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild variant="outline" className="h-11 rounded-xl bg-white"><Link href="/signup">أنشئ أكاديميتك مجانًا</Link></Button>{hasSalesWhatsApp ? <Button asChild className="h-11 rounded-xl"><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> اطلب تجربة موجهة</a></Button> : null}</div></div>
        <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">الأسعار شهرية بالجنيه المصري. تفعيل الدفع الإلكتروني يحتاج إعداد Paymob أو Stripe والتحقق من Webhook قبل تحصيل أي اشتراك.</p>
      </section>

      <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6"><Logo /><p>© {new Date().getFullYear()} MY Academy. جميع الحقوق محفوظة.</p><div className="flex gap-4"><Link href="/" className="transition hover:text-foreground">الرئيسية</Link><Link href="/login" className="transition hover:text-foreground">تسجيل الدخول</Link><Link href="/signup" className="transition hover:text-foreground">إنشاء حساب</Link></div></div></footer>
    </main>
  );
}

function MiniTrust({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-border/80 bg-card p-4 text-center"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>;
}
