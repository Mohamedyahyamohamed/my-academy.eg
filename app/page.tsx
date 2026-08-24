import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Baby,
  BrainCircuit,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Code2,
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
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { loadCurrentUser, roleHome } from "@/services";
import { readPortalSession } from "@/lib/portal-session";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/landing-motion";
import { LandingNavbar } from "@/components/marketing/landing-navbar";

const featureContent = {
  ar: [
    { icon: CalendarCheck, title: "حضور ذكي عبر QR", text: "سجّل الحضور في ثوانٍ، واحتفظ بسجل واضح لكل حصة دون دفاتر أو إدخال متكرر." },
    { icon: BarChart3, title: "تحليلات مبكرة قابلة للفهم", text: "التقط إشارات الغياب وتراجع الدرجات مبكرًا قبل أن تتحول إلى مشكلة كبيرة." },
    { icon: GraduationCap, title: "درجات وواجبات منظمة", text: "أنشئ التقييمات، أدخل الدرجات، وتابع تقدم كل طالب من مساحة واحدة." },
    { icon: Wallet, title: "متابعة مالية واضحة", text: "اعرف المتوقع والمحصّل والمتبقي لكل مجموعة وشهر دون حسابات يدوية." },
    { icon: MessageSquare, title: "بوابات مناسبة لكل دور", text: "المدرس والطالب وولي الأمر يرون ما يخصهم بصلاحيات واضحة وتجربة بسيطة." },
    { icon: ShieldCheck, title: "بيانات الأكاديمية في نطاقها", text: "الوصول مرتبط بالدور والأكاديمية، لتبقى المعلومات الصحيحة في المكان الصحيح." },
  ],
  en: [
    { icon: CalendarCheck, title: "Smart QR attendance", text: "Record attendance in seconds with a clear lesson history and less repetitive work." },
    { icon: BarChart3, title: "Explainable early insights", text: "Spot absence patterns and grade drops early, before they become bigger problems." },
    { icon: GraduationCap, title: "Organized grades and homework", text: "Create assessments, enter scores, and follow every student from one workspace." },
    { icon: Wallet, title: "Clear financial tracking", text: "See expected, collected, and outstanding fees by group and month." },
    { icon: MessageSquare, title: "A portal for every role", text: "Teachers, students, and parents see the right information with simple permissions." },
    { icon: ShieldCheck, title: "Academy-scoped data", text: "Role and academy boundaries keep the right information in the right place." },
  ],
} as const;

const audienceContent = {
  ar: [
    { icon: Building2, title: "صاحب الأكاديمية", text: "رؤية تشغيلية موحّدة للطلاب والفريق والإيرادات والنمو." },
    { icon: UserCog, title: "المدرّس", text: "أدر مجموعاتك وحصصك وحضورك ودرجاتك من مكان واحد." },
    { icon: Baby, title: "ولي الأمر", text: "تابع الحضور والدرجات والواجبات والمدفوعات بوضوح." },
    { icon: School, title: "الطالب", text: "اعرف جدولك وواجباتك ونتائجك من أي جهاز." },
  ],
  en: [
    { icon: Building2, title: "Academy owner", text: "A unified operating view of students, team, revenue, and growth." },
    { icon: UserCog, title: "Teacher", text: "Manage your groups, lessons, attendance, and grades from one place." },
    { icon: Baby, title: "Parent", text: "Follow attendance, grades, homework, and payments with clarity." },
    { icon: School, title: "Student", text: "See your schedule, homework, and results on any device." },
  ],
} as const;

const stepsContent = {
  ar: [
    ["١", "أنشئ مساحتك", "سجّل حسابك واختر اسم الأكاديمية واضبط الأساسيات."],
    ["٢", "أضف فريقك وطلابك", "أدخل البيانات يدويًا أو استوردها ثم ادعُ فريقك."],
    ["٣", "ابدأ التشغيل", "تابع الحضور والدرجات والمدفوعات من لوحة واحدة."],
  ],
  en: [
    ["1", "Create your space", "Sign up, choose your academy name, and configure the essentials."],
    ["2", "Add your team and students", "Enter data manually or import it, then invite your team."],
    ["3", "Start operating", "Track attendance, grades, and payments from one dashboard."],
  ],
} as const;

const faqContent = {
  ar: [
    ["هل أحتاج بطاقة ائتمان للبدء؟", "لا. ابدأ مجانًا دون بطاقة أو التزام، ثم اختر الخطة المناسبة عندما تنمو أكاديميتك."],
    ["هل يمكنني استيراد الطلاب من Excel؟", "الاستيراد الحالي يقبل CSV. صدّر ورقة Excel إلى CSV أولًا، ثم أضف فريقك وطلابك."],
    ["كيف يتابع ولي الأمر ابنه؟", "يحصل ولي الأمر على بوابة آمنة لمتابعة الحضور والدرجات والواجبات والمصاريف."],
    ["هل تناسب المنصة المدرس المستقل؟", "نعم. يمكن للمدرس إدارة طلابه ومجموعاته وعملياته اليومية دون تعقيد غير ضروري."],
  ],
  en: [
    ["Do I need a credit card to start?", "No. Start free without a card or commitment, then choose a plan as your academy grows."],
    ["Can I import students from Excel?", "The current importer accepts CSV. Export your Excel sheet as CSV, then add your team and students."],
    ["How does a parent follow a child?", "Parents receive a secure portal for attendance, grades, homework, and payments."],
    ["Does it work for independent teachers?", "Yes. Teachers can manage their students, groups, and daily operations without unnecessary complexity."],
  ],
} as const;

export default async function LandingPage() {
  const user = await loadCurrentUser();
  const portalSession = await readPortalSession();
  const authenticated = Boolean(user || portalSession);
  const isPortalRole = Boolean(portalSession) || user?.role === "STUDENT" || user?.role === "PARENT";
  const portalDestination = portalSession?.role === "parent" ? "/portal/parent" : "/portal/student";
  const destination = portalSession ? portalDestination : user ? roleHome(user.role) : "/signup";

  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";
  const ctaLabel = authenticated ? (isPortalRole ? (en ? "My portal" : "بوابتي") : (en ? "Go to dashboard" : "الذهاب للوحة التحكم")) : (en ? "Start free" : "ابدأ مجانًا");
  const locale = en ? "en" : "ar";
  const features = featureContent[locale];
  const audiences = audienceContent[locale];
  const steps = stepsContent[locale];
  const faqs = faqContent[locale];
  const salesWhatsAppUrl = process.env.NEXT_PUBLIC_WHATSAPP_SALES_URL?.trim();
  const hasSalesWhatsApp = Boolean(salesWhatsAppUrl?.startsWith("https://wa.me/"));
  const demoEnabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEMO_PREVIEW === "true";

  return (
    <div dir={en ? "ltr" : "rtl"} className="min-h-screen overflow-hidden bg-background text-foreground">
      <LandingNavbar en={en} authenticated={authenticated} destination={destination} ctaLabel={ctaLabel} />

      <main>
        <section className="relative border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,hsl(252_58%_46%_/_0.12),transparent_28%),radial-gradient(circle_at_85%_10%,hsl(190_80%_45%_/_0.10),transparent_24%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
            <Reveal>
              <div className="max-w-2xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-bold text-primary"><Sparkles className="h-3.5 w-3.5" />{en ? "The operating system for modern academies" : "نظام التشغيل للأكاديميات العصرية"}</div>
                <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-6xl">{en ? <>Build a smarter academy.<br /><span className="bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent">Teach with more impact.</span></> : <>ابنِ أكاديمية أذكى.<br /><span className="bg-gradient-to-l from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent">وعلّم بتأثير أكبر.</span></>}</h1>
                <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">{en ? `${APP_CONFIG.name} brings learning, attendance, family communication, and business intelligence into one calm workspace.` : `${APP_CONFIG.name} تجمع التعليم والحضور والتواصل مع الأسرة وذكاء الأعمال داخل مساحة واحدة هادئة وواضحة.`}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="shadow-lg shadow-primary/20"><Link href={destination}>{authenticated ? ctaLabel : (en ? "Create your academy" : "أنشئ أكاديميتك")}<ArrowUpLeft className="ms-1 h-4 w-4" /></Link></Button>
                  <Button asChild size="lg" variant="outline"><Link href={authenticated ? destination : "/login"}>{authenticated ? ctaLabel : (en ? "Student & parent portal" : "دخول الطلاب وأولياء الأمور")}<ChevronLeft className="ms-1 h-4 w-4" /></Link></Button>
                  {!authenticated && demoEnabled && <DemoLoginButton email="admin@myacademy.edu" password="demo1234" label={en ? "Try the demo" : "جرّب العرض التجريبي"} variant="outline" />}
                </div>
                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground sm:text-sm"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{en ? "No credit card" : "دون بطاقة ائتمان"}</span><span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" />{en ? "Ready in minutes" : "جاهز في دقائق"}</span><span className="flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-sky-500" />{en ? "Role-based access" : "صلاحيات حسب الدور"}</span></div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="hero-dashboard-float relative mx-auto w-full max-w-xl">
                <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-cyan-400/20 blur-2xl" />
                <div className="relative rounded-[1.75rem] border border-white/70 bg-card/90 p-4 shadow-2xl shadow-indigo-500/20 ring-1 ring-gray-900/5 transition-transform hover:-translate-y-2 backdrop-blur sm:p-5">
                  <div className="flex items-center justify-between border-b pb-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BrainCircuit className="h-5 w-5" /></div><div><p className="font-bold">{en ? "Owner intelligence" : "ذكاء المالك"}</p><p className="text-xs text-muted-foreground">{en ? "A clear view of today" : "صورة واضحة لليوم"}</p></div></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600">{en ? "LIVE" : "مباشر"}</span></div>
                  <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">{(en ? [["Active students", "248"], ["Attendance", "94%"], ["Collected", "EGP 42.5k"], ["At risk", "06"]] : [["طلاب نشطون", "٢٤٨"], ["الحضور", "٩٤٪"], ["المحصّل", "٤٢٫٥ ألف"], ["تحت المتابعة", "٠٦"]]).map(([label, value], index) => <div key={label} className="rounded-xl border bg-background/70 p-3"><div className={`mb-3 h-1.5 w-8 rounded-full ${["bg-primary", "bg-cyan-500", "bg-emerald-500", "bg-amber-500"][index]}`} /><p className="text-lg font-black sm:text-xl">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>)}</div>
                  <div className="grid gap-3 sm:grid-cols-[1.15fr_.85fr]"><div className="rounded-xl border bg-background/70 p-4"><div className="mb-5 flex items-center justify-between"><p className="text-xs font-bold">{en ? "Attendance trend" : "اتجاه الحضور"}</p><span className="text-[10px] font-bold text-emerald-600">+8.4%</span></div><div className="flex h-32 items-end gap-2">{[45, 62, 55, 76, 68, 91, 80, 96].map((height, index) => <div key={index} className="flex h-full flex-1 items-end"><div className={`w-full rounded-t-lg transition ${index === 7 ? "bg-primary" : "bg-primary/15"}`} style={{ height: `${height}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-[9px] text-muted-foreground"><span>{en ? "4 weeks ago" : "منذ ٤ أسابيع"}</span><span>{en ? "This week" : "هذا الأسبوع"}</span></div></div><div className="rounded-xl border bg-background/70 p-4"><p className="mb-4 text-xs font-bold">{en ? "Priority signals" : "إشارات مهمة"}</p><div className="space-y-3 text-xs"><Activity icon={CheckCircle2} title={en ? "Attendance updated" : "تم تحديث الحضور"} detail={en ? "Math group" : "مجموعة الرياضيات"} /><Activity icon={BarChart3} title={en ? "Grade trend ready" : "اتجاه الدرجات جاهز"} detail={en ? "Monthly assessment" : "تقييم الشهر"} /><Activity icon={ShieldCheck} title={en ? "All data scoped" : "البيانات معزولة"} detail={en ? "Academy workspace" : "مساحة الأكاديمية"} /></div></div></div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><SectionIntro eyebrow={en ? "One calm operating layer" : "طبقة تشغيل واحدة وهادئة"} title={en ? "Less admin noise. More room for teaching." : "ضوضاء إدارية أقل. مساحة أكبر للتعليم."} description={en ? "Every daily workflow is connected, so your team can move from registration to insight without losing the thread." : "كل خطوات العمل اليومية مترابطة، لتنتقل من تسجيل الطالب إلى فهم مستواه دون أن تضيع التفاصيل."} /></Reveal><Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <StaggerItem key={title}><FeatureCard icon={Icon} title={title} text={text} /></StaggerItem>)}</Stagger></div></section>

        <section id="experience" className="border-y bg-slate-950 py-20 text-white sm:py-28"><div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr]"><Reveal><div><p className="text-sm font-bold text-cyan-300">{en ? "Built for practical learning" : "مصممة للتعلّم العملي"}</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{en ? <>From first line of code<br /><span className="text-cyan-300">to confident progress.</span></> : <>من أول سطر كود<br /><span className="text-cyan-300">إلى تقدّم واثق.</span></>}</h2><p className="mt-6 max-w-xl leading-8 text-slate-300">{en ? "MYAcademy is designed around hands-on practice, problem solving, and visible progress — with technology that supports the teacher instead of distracting from the classroom." : "صُممت MYAcademy حول التطبيق العملي وحل المشكلات ورؤية التقدم بوضوح، بتقنية تدعم المدرس ولا تشتت الفصل."}</p><div className="mt-8 flex flex-wrap gap-3"><span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200"><Code2 className="me-2 inline h-4 w-4 text-cyan-300" />{en ? "Programming" : "البرمجة"}</span><span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200"><BrainCircuit className="me-2 inline h-4 w-4 text-violet-300" />{en ? "AI & data" : "الذكاء الاصطناعي والبيانات"}</span><span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200"><BarChart3 className="me-2 inline h-4 w-4 text-emerald-300" />{en ? "Real progress" : "تقدم حقيقي"}</span></div></div></Reveal><Reveal delay={0.1}><div className="grid gap-4 sm:grid-cols-2"><TrustCardDark icon={Code2} title={en ? "Practice first" : "التطبيق أولًا"} text={en ? "Turn every lesson into a clear next step for the learner." : "حوّل كل حصة إلى خطوة تالية واضحة للمتعلم."} /><TrustCardDark icon={LineChart} title={en ? "Progress you can see" : "تقدم تراه"} text={en ? "Connect attendance, grades, and feedback in one narrative." : "اربط الحضور والدرجات والملاحظات في صورة واحدة."} /><TrustCardDark icon={ShieldCheck} title={en ? "Technology with boundaries" : "تقنية بحدود واضحة"} text={en ? "Give each role the context it needs and no more." : "امنح كل دور السياق الذي يحتاجه دون زيادة."} /><TrustCardDark icon={Sparkles} title={en ? "Made for momentum" : "مصممة للاستمرارية"} text={en ? "Simple routines that help your academy keep moving." : "روتين بسيط يساعد أكاديميتك على الاستمرار والتقدم."} /></div></Reveal></div></section>

        <section id="audiences" className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><SectionIntro eyebrow={en ? "One experience, four perspectives" : "تجربة واحدة، أربع زوايا"} title={en ? "Everyone sees exactly what they need." : "كل شخص يرى ما يحتاجه بالضبط."} description={en ? "Clear workspaces and appropriate permissions keep every interaction focused." : "مساحات واضحة وصلاحيات مناسبة تجعل كل تفاعل أكثر تركيزًا."} /></Reveal><Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{audiences.map(({ icon: Icon, title, text }) => <StaggerItem key={title}><div className="group h-full rounded-2xl border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div></StaggerItem>)}</Stagger></div></section>

        <section id="how" className="border-y bg-muted/30 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6"><Reveal><SectionIntro eyebrow={en ? "Start without complexity" : "ابدأ بدون تعقيد"} title={en ? "A clear path from setup to momentum." : "طريق واضح من الإعداد إلى الاستمرارية."} description={en ? "Start with the essentials and grow your operating rhythm at your own pace." : "ابدأ بالأساسيات وطوّر إيقاع التشغيل بالسرعة المناسبة لك."} /></Reveal><Stagger className="relative mt-14 grid gap-10 md:grid-cols-3">{steps.map(([number, title, text], index) => <StaggerItem key={number}><div className="relative text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-lg shadow-primary/20">{number}</div><h3 className="mt-6 font-bold">{title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-muted-foreground">{text}</p>{index < 2 && <div className="absolute left-[calc(50%+4rem)] right-[calc(-50%+4rem)] top-8 hidden border-t border-dashed border-primary/25 md:block" />}</div></StaggerItem>)}</Stagger></div></section>

        <section className="py-20 sm:py-28"><div className="mx-auto max-w-5xl px-4 sm:px-6"><Reveal><div className="rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-cyan-500/10 p-8 sm:p-12"><div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-primary">{en ? "Clarity before commitment" : "وضوح قبل الالتزام"}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{en ? "Your academy deserves better tools." : "أكاديميتك تستحق أدوات أفضل."}</h2><p className="mt-4 max-w-xl leading-8 text-muted-foreground">{en ? "Start with a focused workspace for your daily operations, then expand as your academy grows." : "ابدأ بمساحة مركزة لعملياتك اليومية، ثم وسّع استخدامك مع نمو الأكاديمية."}</p></div><div className="flex shrink-0 flex-wrap gap-3"><Button asChild size="lg"><Link href={destination}>{authenticated ? ctaLabel : (en ? "Start free" : "ابدأ مجانًا")}<ArrowLeft className="ms-1 h-4 w-4" /></Link></Button>{hasSalesWhatsApp ? <Button asChild size="lg" variant="outline"><a href={salesWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle className="me-1 h-4 w-4" />{en ? "Talk to us" : "تواصل معنا"}</a></Button> : <Button asChild size="lg" variant="outline"><Link href="/pricing">{en ? "Compare plans" : "قارن الخطط"}</Link></Button>}</div></div><div className="mt-10 grid gap-3 border-t pt-6 text-sm text-muted-foreground sm:grid-cols-3"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? "No commitment" : "دون التزام"}</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? "Arabic-first experience" : "تجربة عربية أولًا"}</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? "Designed for real operations" : "مصممة للتشغيل الحقيقي"}</span></div></div></Reveal></div></section>

        <section className="border-t py-20 sm:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6"><Reveal><SectionIntro eyebrow={en ? "Frequently asked questions" : "أسئلة شائعة"} title={en ? "Start with the answers you need." : "ابدأ بالإجابات التي تحتاجها."} description={en ? "Still have a question? Our team can help you find the right starting point." : "ما زال لديك سؤال؟ ابدأ مجانًا أو تواصل معنا لنساعدك في الخطوة الأولى."} /></Reveal><div className="mt-10 space-y-3">{faqs.map(([question, answer]) => <Reveal key={question}><details className="group rounded-2xl border bg-card p-5 transition hover:border-primary/25"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold"><span>{question}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-lg transition group-open:rotate-45">+</span></summary><p className="mt-4 text-sm leading-7 text-muted-foreground">{answer}</p></details></Reveal>)}</div></div></section>
      </main>

      <footer className="border-t py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6"><Logo /><p>© {new Date().getFullYear()} {APP_CONFIG.name}. {en ? "All rights reserved." : "جميع الحقوق محفوظة."}</p><div className="flex flex-wrap justify-center gap-4"><Link href="/login">{en ? "Sign in" : "تسجيل الدخول"}</Link><Link href="/pricing">{en ? "Pricing" : "الأسعار"}</Link><Link href="/status">{en ? "Service status" : "حالة الخدمة"}</Link><Link href="/support">{en ? "Support" : "الدعم"}</Link></div></div></footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold text-primary">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 leading-8 text-muted-foreground">{description}</p></div>;
}

function FeatureCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="group h-full rounded-2xl border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>;
}

function TrustCardDark({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:bg-white/[0.1]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-cyan-300"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-300">{text}</p></div>;
}

function Activity({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 shrink-0 text-emerald-500" /><div className="min-w-0"><p className="truncate font-semibold">{title}</p><p className="truncate text-muted-foreground">{detail}</p></div></div>;
}
