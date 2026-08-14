import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Baby,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  GraduationCap,
  LineChart,
  LockKeyhole,
  MessageCircle,
  MessageSquare,
  School,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser, roleHome } from "@/services";
import { redirect } from "next/navigation";

const features = [
  { icon: Users, title: "إدارة الطلاب", desc: "ملف موحّد لكل طالب وولي أمر ومجموعة، من التسجيل حتى المتابعة اليومية.", tone: "violet" },
  { icon: CalendarCheck, title: "الحضور الذكي", desc: "سجّل الحضور يدويًا أو عبر QR، وتابع الغياب قبل أن يتحول إلى مشكلة.", tone: "sky" },
  { icon: Wallet, title: "المدفوعات والفواتير", desc: "اعرف ما تم تحصيله وما يستحق، وأصدر إيصالات واضحة لكل عملية.", tone: "emerald" },
  { icon: GraduationCap, title: "الدرجات والواجبات", desc: "أنشئ الواجبات، أدخل الدرجات، وشارك تقدم الطلاب مع أولياء الأمور.", tone: "amber" },
  { icon: MessageSquare, title: "تواصل منضبط", desc: "رسائل داخلية وتنبيهات اختيارية عبر واتساب وفق إعداداتك وموافقة ولي الأمر.", tone: "rose" },
  { icon: BarChart3, title: "تقارير تساعدك", desc: "حوّل بيانات الحضور والتحصيل والإيرادات إلى قرارات يومية أفضل.", tone: "indigo" },
];

const audiences = [
  { icon: Building2, title: "صاحب الأكاديمية", desc: "صورة كاملة عن الطلاب، الفريق، الإيرادات، والنمو.", accent: "bg-brand-50 text-brand-700" },
  { icon: UserCog, title: "المدرّس", desc: "إدارة المجموعات والحصص والحضور والدرجات من مكان واحد.", accent: "bg-sky-50 text-sky-700" },
  { icon: Baby, title: "ولي الأمر", desc: "متابعة الحضور والدرجات والواجبات والمستحقات بسهولة.", accent: "bg-emerald-50 text-emerald-700" },
  { icon: School, title: "الطالب", desc: "جدوله وواجباته ودرجاته متاحة في أي وقت ومن أي جهاز.", accent: "bg-amber-50 text-amber-700" },
];

const faqs = [
  { q: "هل أحتاج بطاقة ائتمان للبدء؟", a: "لا. أنشئ حسابك وابدأ مجانًا دون بطاقة أو التزام، ثم اختر الخطة المناسبة عندما تنمو أكاديميتك." },
  { q: "هل يمكنني استيراد الطلاب من Excel؟", a: "نعم، يمكنك استيراد كشف الطلاب من ملف Excel أو CSV، ثم دعوة المدرسين وأولياء الأمور إلى المنصة." },
  { q: "كيف يتابع أولياء الأمور أبناءهم؟", a: "يحصل كل ولي أمر على بوابة مخصصة للاطّلاع على الدرجات والحضور والواجبات والمصاريف. ويمكن تفعيل رسائل واتساب بعد إعداد القناة والموافقة." },
  { q: "هل بيانات الأكاديمية محمية؟", a: "نعم. تعتمد المنصة على صلاحيات مرتبطة بالدور والأكاديمية، مع حماية على مستوى قاعدة البيانات وفحص للصلاحيات على الخادم." },
];

export default function LandingPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const salesWhatsAppUrl = process.env.NEXT_PUBLIC_WHATSAPP_SALES_URL?.trim();
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 text-sm font-medium md:flex">
            <a href="#features" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">المزايا</a>
            <a href="#audiences" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">لمن هذه المنصة</a>
            <a href="#how" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">كيف تعمل</a>
            <Link href="/pricing" className="rounded-full px-4 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">الأسعار</Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">تسجيل الدخول</Link></Button>
            <Button asChild size="sm" className="shadow-sm shadow-brand-500/20"><Link href="/signup">ابدأ مجانًا <ArrowLeft className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate border-b border-border/60">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-200/35 blur-3xl" />
            <div className="absolute -bottom-48 -left-20 h-[28rem] w-[28rem] rounded-full bg-sky-100/70 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,#8b5cf6_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf6_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
          </div>
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/75 px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm shadow-brand-100">
                <Sparkles className="h-3.5 w-3.5" />
                منصة عربية لإدارة الأكاديميات في مصر
              </div>
              <h1 className="max-w-xl text-4xl font-black leading-[1.18] tracking-tight sm:text-5xl lg:text-[3.85rem]">
                إدارة أكاديميتك أصبحت <span className="bg-gradient-to-l from-brand-600 to-violet-400 bg-clip-text text-transparent">أوضح وأسهل.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                {APP_CONFIG.name} تجمع الطلاب والمجموعات والحضور والدرجات والمدفوعات في مساحة واحدة — مع بوابات مخصصة للمدير والمدرّس وولي الأمر والطالب.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 shadow-lg shadow-brand-500/20"><Link href="/signup">أنشئ أكاديميتك مجانًا <ArrowLeft className="h-4 w-4" /></Link></Button>
                <DemoLoginButton email="admin@myacademy.edu" password="demo1234" label="جرّب العرض التجريبي" variant="outline" />
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground sm:text-sm">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> دون بطاقة ائتمان</span>
                <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-brand-500" /> إعداد في دقائق</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-sky-500" /> صلاحيات محمية</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/20 via-transparent to-sky-400/20 blur-2xl" />
              <div className="relative rounded-[1.35rem] border border-white/80 bg-white/90 p-3 shadow-2xl shadow-brand-900/10 backdrop-blur sm:p-4">
                <div className="rounded-xl border border-border/70 bg-[#fbfbfe] p-4 sm:p-5">
                  <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"><LineChart className="h-4.5 w-4.5" /></div>
                      <div><p className="text-sm font-bold">لوحة التحكم</p><p className="text-[11px] text-muted-foreground">ملخص أكاديميتك اليوم</p></div>
                    </div>
                    <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <HeroStat label="إجمالي الطلاب" value="248" color="bg-brand-500" />
                    <HeroStat label="نسبة الحضور" value="94%" color="bg-sky-500" />
                    <HeroStat label="المحصّل" value="٤٢٬٥٠٠ ج" color="bg-emerald-500" />
                    <HeroStat label="المجموعات" value="12" color="bg-amber-500" />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_.85fr]">
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold">الحضور هذا الأسبوع</p><span className="text-[11px] font-semibold text-emerald-600">+8.4%</span></div>
                      <div className="flex h-28 items-end justify-between gap-2">
                        {[48, 65, 57, 82, 70, 92, 78].map((height, index) => <div key={index} className="flex h-full flex-1 items-end"><div className={`w-full rounded-t-md ${index === 5 ? "bg-brand-500" : "bg-brand-100"}`} style={{ height: `${height}%` }} /></div>)}
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>السبت</span><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span></div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <p className="mb-3 text-xs font-bold">آخر النشاطات</p>
                      <div className="space-y-3 text-[11px]">
                        <Activity icon={CheckCircle2} title="تم تسجيل حضور" detail="مجموعة الرياضيات" tone="text-emerald-500" />
                        <Activity icon={Wallet} title="تم تحصيل دفعة" detail="أحمد محمد" tone="text-brand-500" />
                        <Activity icon={MessageSquare} title="رسالة جديدة" detail="ولي أمر" tone="text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> البيانات محدثة الآن</span><span>MY Academy</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionIntro eyebrow="كل أدواتك في مكان واحد" title="ركّز على التعليم، واترك التنظيم لنا" description="من أول تسجيل الطالب إلى تقرير نهاية الشهر، صمّمنا الأدوات لتناسب إيقاع الأكاديمية اليومي." />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>
          </div>
        </section>

        <section id="audiences" className="border-y border-border/60 bg-muted/35 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.82fr_1.18fr]">
            <div>
              <p className="text-sm font-bold text-brand-600">تجربة واحدة، أربع بوابات</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">كل شخص يرى ما يحتاجه بالضبط.</h2>
              <p className="mt-5 max-w-lg leading-8 text-muted-foreground">بدل عشرات الأدوات المنفصلة، تمنح MY Academy كل دور مساحة واضحة وصلاحيات مناسبة، مع بقاء بيانات الأكاديمية في نطاق آمن.</p>
              <div className="mt-7 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-4 text-sm text-brand-900"><LockKeyhole className="h-5 w-5 shrink-0 text-brand-600" /><span><strong>الخصوصية جزء من التصميم.</strong> لا يرى كل مستخدم إلا البيانات المرتبطة بدوره وأكاديميته.</span></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {audiences.map((audience) => <div key={audience.title} className="group rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-900/5"><div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${audience.accent}`}><audience.icon className="h-6 w-6" /></div><h3 className="font-bold">{audience.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{audience.desc}</p><div className="mt-5 flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">استكشف البوابة <ArrowLeft className="h-3.5 w-3.5" /></div></div>)}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionIntro eyebrow="ابدأ بدون تعقيد" title="من الفكرة إلى التشغيل في ثلاث خطوات" description="لا تحتاج إلى فريق تقني أو أيام من الإعداد. ابدأ بالأساسيات ووسّع استخدامك مع الوقت." />
            <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              <div className="absolute right-[16.5%] left-[16.5%] top-7 hidden h-px bg-gradient-to-l from-brand-200 via-brand-400 to-brand-200 md:block" />
              <Step n="١" title="أنشئ أكاديميتك" text="سجّل حسابك، اختر اسم الأكاديمية، واضبط إعداداتك الأساسية في دقائق." />
              <Step n="٢" title="أضف فريقك وطلابك" text="أضف البيانات يدويًا أو استوردها من Excel، ثم ادعُ المدرسين وأولياء الأمور." />
              <Step n="٣" title="ابدأ الإدارة" text="سجّل الحضور والدرجات والمدفوعات، وتابع الصورة الكاملة من لوحة واحدة." />
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/25 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionIntro eyebrow="وضوح قبل الاشتراك" title="اعرف ما الذي تحصل عليه وما الذي يحتاج إعدادًا" description="نوضح حدود الخطط والتكاملات من البداية، حتى تختار بهدوء وتبني تشغيلك على توقعات واقعية." />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <TrustCard icon={ShieldCheck} title="صلاحيات حسب الدور" text="يصل كل مستخدم إلى المساحة المرتبطة بدوره وأكاديميته، مع فحص للصلاحيات على الخادم." />
              <TrustCard icon={MessageSquare} title="التكاملات اختيارية" text="واتساب والدفع الإلكتروني لا يُفعلان إلا بعد إعداد القناة والتحقق من الإعدادات والموافقة." />
              <TrustCard icon={LineChart} title="قرارات مبنية على بياناتك" text="تبدأ بالمؤشرات الأساسية، ثم تتوسع إلى تقارير الحضور والتحصيل والإيرادات مع نمو الأكاديمية." />
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-6 text-center sm:flex-row sm:text-right">
              <div><p className="font-black">تدير أكثر من فرع أو تحتاج إعدادًا خاصًا؟</p><p className="mt-1 text-sm leading-6 text-muted-foreground">ابدأ مجانًا أو اطلب مسارًا مخصصًا لخطة المؤسسات ودعم الانتقال.</p></div>
              <div className="flex flex-wrap justify-center gap-3"><Button asChild variant="outline" className="rounded-xl bg-white"><Link href="/pricing">قارن الخطط</Link></Button><Button asChild className="rounded-xl"><Link href="/status">تحقق من حالة الخدمة <ArrowLeft className="h-4 w-4" /></Link></Button></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-[#17152b] py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div><p className="text-sm font-bold text-violet-300">مبنية لتكبر معك</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">قرارات أسرع. متابعة أوضح. وقت أكثر للتعليم.</h2><p className="mt-5 max-w-lg leading-8 text-white/65">اجمع التشغيل اليومي والتقارير والتواصل في نظام واحد، بدل البحث بين جداول ورسائل متفرقة.</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><DarkValue icon={Database} title="بيانات منظمة" text="سجل واحد لكل طالب ومجموعة ودفعة." /><DarkValue icon={Zap} title="تشغيل أسرع" text="اختصارات وتقارير للمهام المتكررة." /><DarkValue icon={ShieldCheck} title="ثقة أعلى" text="صلاحيات واضحة وسجل نشاط قابل للمراجعة." /></div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6"><SectionIntro eyebrow="أسئلة شائعة" title="كل ما تحتاج معرفته قبل البدء" description="وإذا بقي سؤال، يمكنك البدء مجانًا أو التواصل معنا للحصول على تجربة موجهة." /><div className="mt-10 space-y-3">{faqs.map((faq) => <details key={faq.q} className="group rounded-xl border border-border bg-card p-5 transition hover:border-brand-200"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold"><span>{faq.q}</span><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-normal text-muted-foreground transition group-open:rotate-45">+</span></summary><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{faq.a}</p></details>)}</div></div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-24"><div className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] bg-gradient-to-bl from-brand-600 via-brand-700 to-[#2b1e66] px-6 py-14 text-center text-white shadow-2xl shadow-brand-900/20 sm:px-12"><div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" /><div className="absolute -bottom-32 -right-10 h-72 w-72 rounded-full bg-violet-300/15 blur-3xl" /><div className="relative"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><GraduationCap className="h-7 w-7" /></div><h2 className="mt-6 text-3xl font-black sm:text-4xl">جاهز لترتيب أكاديميتك؟</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">ابدأ مجانًا، أضف أول طلابك، وشاهد كيف تصبح المتابعة اليومية أبسط.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild size="lg" variant="secondary" className="h-12 rounded-xl px-6"><Link href="/signup">أنشئ أكاديميتك مجانًا <ArrowLeft className="h-4 w-4" /></Link></Button>{hasSalesWhatsApp ? <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/30 bg-white/10 px-6 text-white hover:bg-white/20 hover:text-white"><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> اطلب تجربة موجهة</a></Button> : <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/30 bg-white/10 px-6 text-white hover:bg-white/20 hover:text-white"><Link href="/pricing">قارن الخطط والأسعار</Link></Button>}</div><div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/65">{["دون التزام", "دعم بالعربية", "إعداد في دقائق"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-violet-200" /> {item}</span>)}</div></div></div></section>
      </main>

      <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6"><Logo /><p>© {new Date().getFullYear()} {APP_CONFIG.name}. جميع الحقوق محفوظة.</p><div className="flex gap-4"><Link href="/login" className="transition hover:text-foreground">تسجيل الدخول</Link><Link href="/pricing" className="transition hover:text-foreground">الأسعار</Link><Link href="/status" className="transition hover:text-foreground">حالة الخدمة</Link><Link href="/signup" className="transition hover:text-foreground">إنشاء حساب</Link></div></div></footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold text-brand-600">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{description}</p></div>;
}

function FeatureCard({ icon: Icon, title, desc, tone }: { icon: typeof Users; title: string; desc: string; tone: string }) {
  const tones: Record<string, string> = { violet: "bg-violet-50 text-violet-700", sky: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className="group rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5"><div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5.5 w-5.5" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{desc}</p><div className="mt-5 h-1 w-8 rounded-full bg-brand-200 transition-all duration-200 group-hover:w-14 group-hover:bg-brand-500" /></div>;
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return <div className="relative text-center"><div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-lg shadow-brand-500/25">{n}</div><h3 className="mt-6 font-bold">{title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-muted-foreground">{text}</p></div>;
}

function TrustCard({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-900/5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>;
}

function DarkValue({ icon: Icon, title, text }: { icon: typeof Database; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"><Icon className="h-5 w-5 text-violet-300" /><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></div>;
}

function Activity({ icon: Icon, title, detail, tone }: { icon: typeof CheckCircle2; title: string; detail: string; tone: string }) {
  return <div className="flex items-center gap-2.5"><Icon className={`h-4 w-4 shrink-0 ${tone}`} /><div className="min-w-0"><p className="truncate font-semibold">{title}</p><p className="truncate text-muted-foreground">{detail}</p></div></div>;
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="rounded-xl border border-border/70 bg-card p-3"><div className={`mb-2 h-1.5 w-8 rounded-full ${color}`} /><p className="text-base font-black sm:text-lg">{value}</p><p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{label}</p></div>;
}
