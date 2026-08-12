import Link from "next/link";
import {
  Users,
  Wallet,
  GraduationCap,
  CalendarCheck,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  Check,
  ShieldCheck,
  Building2,
  UserCog,
  Baby,
  School,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser, roleHome } from "@/services";
import { redirect } from "next/navigation";

export default function LandingPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const features = [
    { icon: Users, title: "إدارة الطلاب", desc: "سجلات الطلاب وأولياء الأمور والمجموعات في مكان واحد منظّم." },
    { icon: CalendarCheck, title: "الحضور", desc: "ثلاث طرق لتسجيل الحضور: يدوي، QR، وتسجيل ذاتي مع تنبيهات الغياب." },
    { icon: Wallet, title: "المصاريف والفواتير", desc: "تتبّع المدفوعات والمتأخرات وإيصالات احترافية لكل طالب." },
    { icon: GraduationCap, title: "الدرجات والواجبات", desc: "تسجيل الدرجات، الواجبات، وشهادات تقدير قابلة للطباعة." },
    { icon: MessageSquare, title: "إشعارات واتساب", desc: "إشعارات تلقائية للوالدين بالدرجات والمدفوعات والغياب." },
    { icon: BarChart3, title: "تقارير وتحليلات", desc: "لوحات تحكم وإحصائيات ذكية تساعدك على اتخاذ قرارات أفضل." },
  ];

  const audiences = [
    { icon: Building2, title: "صاحب أكاديمية", desc: "تحكّم كامل في كل شيء: الطلاب، المدرّسين، المصاريف، والتقارير." },
    { icon: UserCog, title: "مدرّس", desc: "أدر مجموعاتك وحصصك وسجّل الحضور والدرجات بسهولة." },
    { icon: Baby, title: "ولي أمر", desc: "تابع درجات ابنك وحضوره ومصاريفه لحظة بلحظة عبر بوابة مخصصة." },
    { icon: School, title: "طالب", desc: "اطّلع على جدولك وواجباتك ودرجاتك في أي وقت." },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">المزايا</a>
            <a href="#audiences" className="hover:text-foreground">لمن هذه المنصة</a>
            <a href="#how" className="hover:text-foreground">كيف تعمل</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">ابدأ مجانًا</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-600/10 via-transparent to-brand-900/10" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkle /> منصة إدارة الأكاديميات الأولى في مصر
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              أدر أكاديميتك <span className="text-brand-600">في مكان واحد</span>، ببساطة وأناقة.
            </h1>
            <p className="text-lg text-muted-foreground">
              {APP_CONFIG.name} منصة متكاملة لإدارة الطلاب والمجموعات والحضور والمصاريف
              والدرجات — مع بوابات للمدرّسين وأولياء الأمور والطلاب، وإشعارات واتساب تلقائية.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">ابدأ مجانًا <ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <DemoLoginButton
                email="admin@myacademy.edu"
                password="demo1234"
                label="جربة كأدمن"
                variant="outline"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              بدون بطاقة ائتمان • إعداد في دقائق • جربة فورية بالحساب التجريبي
            </p>
          </div>

          {/* Hero visual card */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">لوحة التحكم</span>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <HeroStat label="إجمالي الطلاب" value="248" color="bg-brand-500" />
                <HeroStat label="المحصّل" value="٤٢٬٥٠٠ ج" color="bg-emerald-500" />
                <HeroStat label="نسبة الحضور" value="94%" color="bg-sky-500" />
                <HeroStat label="المجموعات" value="12" color="bg-violet-500" />
              </div>
              <div className="mt-3 space-y-2">
                <HeroBar label="ماث" pct={80} />
                <HeroBar label="فيزياء" pct={55} />
                <HeroBar label="لغة عربية" pct={92} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">كل اللي أكاديميتك محتاجاه</h2>
            <p className="mt-3 text-muted-foreground">
              أدوات قوية وبسيطة توفّر وقتك وتنظّم شغلك من أول التسجيل لحد التقارير.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-brand-300">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">منصة لكل أفراد الأكاديمية</h2>
            <p className="mt-3 text-muted-foreground">لكل واحد بوابة وصلاحيات تناسب دوره بالظبط.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <a.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">ابدأ في 3 خطوات</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: "١", t: "أنشئ أكاديميتك", d: "سجّل حساب صاحب أكاديمية واضبط اسمك ولونك في ثواني." },
              { n: "٢", t: "ضُيف طلابك ومدرّسيك", d: "أضف الطلاب يدويًا أو استورد من Excel، وادعُ المدرّسين." },
              { n: "٣", t: "ابدأ الإدارة", d: "سجّل الحضور والدرجات والمصاريف، والأهل يتوصّلوا بالإشعارات." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-bl from-brand-600 to-brand-800 px-6 py-12 text-center text-white">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-3xl font-bold">جاهز تبدأ؟</h2>
          <p className="mx-auto mt-3 max-w-md text-white/80">
            انضم لأكاديميات بتثق في {APP_CONFIG.name} وارتّب شغلك النهارده.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup">أنشئ أكاديميتك مجانًا</Link>
            </Button>
            <DemoLoginButton
              email="admin@myacademy.edu"
              password="demo1234"
              label="جربة العرض التجريبي"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {["آمنة ومحميّة", "بدون التزام", "دعم بالعربي"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} {APP_CONFIG.name}. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">تسجيل الدخول</Link>
            <Link href="/signup" className="hover:text-foreground">إنشاء حساب</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className={`mb-2 h-1.5 w-8 rounded-full ${color}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function HeroBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Sparkle() {
  return <Sparkles className="h-3.5 w-3.5" />;
}
