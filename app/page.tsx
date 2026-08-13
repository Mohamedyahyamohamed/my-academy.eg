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
  MessageCircle,
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

  const salesWhatsAppUrl = process.env.NEXT_PUBLIC_WHATSAPP_SALES_URL?.trim();
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));

  const features = [
    { icon: Users, title: "إدارة الطلاب", desc: "سجلات الطلاب وأولياء الأمور والمجموعات في مكان واحد منظّم." },
    { icon: CalendarCheck, title: "الحضور", desc: "ثلاث طرق لتسجيل الحضور: يدوي، رمز QR، وتسجيل ذاتي مع تنبيهات الغياب." },
    { icon: Wallet, title: "المصاريف والفواتير", desc: "تتبّع المدفوعات والمتأخرات وإصدار إيصالات احترافية لكل طالب." },
    { icon: GraduationCap, title: "الدرجات والواجبات", desc: "تسجيل الدرجات والواجبات وشهادات تقدير قابلة للطباعة." },
    { icon: MessageSquare, title: "إشعارات واتساب", desc: "رسائل للغياب والدرجات والمدفوعات عند تفعيل الربط وموافقة ولي الأمر." },
    { icon: BarChart3, title: "التقارير والتحليلات", desc: "لوحات تحكم وإحصائيات ذكية تساعدك على اتخاذ قرارات أفضل." },
  ];

  const audiences = [
    { icon: Building2, title: "صاحب أكاديمية", desc: "تحكّم كامل: الطلاب، المدرّسون، المصاريف، والتقارير." },
    { icon: UserCog, title: "مدرّس", desc: "إدارة المجموعات والحصص وتسجيل الحضور والدرجات بسهولة." },
    { icon: Baby, title: "ولي أمر", desc: "متابعة درجات الابن وحضوره ومصاريفه عبر بوابة مخصصة." },
    { icon: School, title: "طالب", desc: "الاطّلاع على الجدول والواجبات والدرجات في أي وقت." },
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
            <Link href="/pricing" className="hover:text-foreground">الأسعار</Link>
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
              <Sparkles className="h-3.5 w-3.5" /> منصة عربية لإدارة الأكاديميات في مصر
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              أدر أكاديميتك <span className="text-brand-600">في مكان واحد</span>، ببساطة وأناقة.
            </h1>
            <p className="text-lg text-muted-foreground">
              {APP_CONFIG.name} منصة متكاملة لإدارة الطلاب والمجموعات والحضور والمصاريف
              والدرجات — مع بوابات للمدرّسين وأولياء الأمور والطلاب، وإشعارات اختيارية منضبطة عبر واتساب.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">ابدأ مجانًا <ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <DemoLoginButton
                email="admin@myacademy.edu"
                password="demo1234"
                label="جرّب العرض التجريبي"
                variant="outline"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              دون بطاقة ائتمان • إعداد في دقائق • تجربة فورية بالحساب التجريبي
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
                <HeroBar label="رياضيات" pct={80} />
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
            <h2 className="text-3xl font-bold tracking-tight">كل ما تحتاجه أكاديميتك</h2>
            <p className="mt-3 text-muted-foreground">
              أدوات قوية وبسيطة توفّر وقتك وتنظّم عملك من التسجيل وحتى التقارير.
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
            <p className="mt-3 text-muted-foreground">لكل دور بوابة وصلاحيات تناسبه بالضبط.</p>
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
            <h2 className="text-3xl font-bold tracking-tight">ابدأ في ثلاث خطوات</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: "١", t: "أنشئ أكاديميتك", d: "سجّل حساب صاحب أكاديمية واضبط اسمك ولونك في ثوانٍ." },
              { n: "٢", t: "أضف طلابك ومدرّسيك", d: "أضف الطلاب يدويًا أو استوردهم من Excel، وادعُ المدرّسين." },
              { n: "٣", t: "ابدأ الإدارة", d: "سجّل الحضور والدرجات والمصاريف، ويتلقّى أولياء الأمور الإشعارات تلقائيًا." },
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

      {/* Value proposition */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">مصممة لروتين الأكاديمية اليومي</h2>
            <p className="mt-3 text-muted-foreground">ابدأ بعملية منظمة الآن، ثم فعّل الأدوات التي تحتاجها مع نمو الأكاديمية.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { title: "بيانات منظمة", text: "ملفات للطلاب وأولياء الأمور والمدرسين ومجموعات الدراسة، ضمن أكاديميتك فقط." },
              { title: "متابعة واضحة", text: "حضور ودرجات وواجبات ومدفوعات وتقارير قابلة للطباعة لتمكين القرار اليومي." },
              { title: "تواصل منضبط", text: "بوابات منفصلة للأدوار، ورسائل اختيارية لا تُرسل إلا وفق الإعدادات والموافقة." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">أسئلة شائعة</h2>
          </div>
          <div className="mt-10 space-y-3">
            {[
              { q: "هل أحتاج بطاقة ائتمان للبدء؟", a: "لا. أنشئ حسابك وابدأ مجانًا دون أي بطاقة أو التزام." },
              { q: "كيف يتابع أولياء الأمور أبناءهم؟", a: "يحصل كل ولي أمر على بوابة مخصصة للاطّلاع على الدرجات والحضور والمصاريف. يمكن تفعيل رسائل واتساب بعد إعداد القناة وتسجيل الموافقة." },
              { q: "هل يمكنني استيراد الطلاب من Excel؟", a: "نعم، يمكنك استيراد كشف طلاب كامل من ملف Excel مع إنشاء حسابات تلقائية للطلاب وأولياء الأمور." },
              { q: "هل بياناتي محمية؟", a: "جميع البيانات محمية بنظام أمان على مستوى قاعدة البيانات (RLS)، وتمرّ كل صلاحية بفحص أمني على الخادم." },
            ].map((f) => (
              <details key={f.q} className="group rounded-lg border border-border bg-card p-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-bl from-brand-600 to-brand-800 px-6 py-12 text-center text-white">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-3xl font-bold">جاهز للبدء؟</h2>
          <p className="mx-auto mt-3 max-w-md text-white/80">
            أنشئ أكاديميتك مجانًا، واستورد طلابك وابدأ التجربة على بياناتك الفعلية.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup">أنشئ أكاديميتك مجانًا</Link>
            </Button>
            {hasSalesWhatsApp ? (
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> اطلب تجربة موجهة عبر واتساب</a>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/pricing">قارن الخطط والأسعار</Link>
              </Button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {["آمنة ومحميّة", "دون التزام", "دعم بالعربية"].map((t) => (
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
            <Link href="/pricing" className="hover:text-foreground">الأسعار</Link>
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
