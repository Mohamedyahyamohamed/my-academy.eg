import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listPlans } from "@/services/saas";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "./pricing-plans";

export const dynamic = "force-static";

export default function PricingPage() {
  const plans = listPlans();
  const salesWhatsAppUrl = process.env.NEXT_PUBLIC_WHATSAPP_SALES_URL?.trim();

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">الرئيسية</Link>
            <a href="#plans" className="rounded-full bg-muted px-4 py-2 text-foreground">الأسعار</a>
            <Link href="/#features" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">المزايا</Link>
            <Link href="/status" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">حالة الخدمة</Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2"><LanguageToggle /><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">تسجيل الدخول</Link></Button><Button asChild size="sm"><Link href="/signup">ابدأ مجانًا <ArrowLeft className="h-4 w-4" /></Link></Button></div>
        </div>
      </header>

      <section className="relative isolate border-b border-border/60 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute -right-32 -top-44 h-[30rem] w-[30rem] rounded-full bg-brand-200/35 blur-3xl" /><div className="absolute -bottom-56 left-0 h-[25rem] w-[25rem] rounded-full bg-sky-100/70 blur-3xl" /></div>
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700">خطط مرنة تناسب مرحلة أكاديميتك</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">ابدأ مجانًا، وتوسّع بثقة</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">اختر الخطة التي تناسب عدد طلابك اليوم. قارن الحدود والمزايا، ثم اختر الدفع الشهري أو السنوي عندما تكون جاهزًا.</p></div>
      </section>

      <section id="plans" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <PricingPlans plans={plans} salesWhatsAppUrl={salesWhatsAppUrl} />
      </section>

      <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6"><Logo /><p>© {new Date().getFullYear()} MY Academy. جميع الحقوق محفوظة.</p><div className="flex gap-4"><Link href="/" className="transition hover:text-foreground">الرئيسية</Link><Link href="/status" className="transition hover:text-foreground">حالة الخدمة</Link><Link href="/login" className="transition hover:text-foreground">تسجيل الدخول</Link><Link href="/signup" className="transition hover:text-foreground">إنشاء حساب</Link></div></div></footer>
    </main>
  );
}
