import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  FileSpreadsheet,
  GraduationCap,
  Headphones,
  MessageSquareText,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/services";
import type { Role } from "@/types";

const roleGuides: Record<Role, { title: string; description: string; steps: Array<{ title: string; description: string; href: string; icon: typeof Rocket }> }> = {
  ADMIN: {
    title: "ابدأ تشغيل أكاديميتك",
    description: "رتّب الأكاديمية وابدأ بأول مجموعة وطلابك في خطوات بسيطة.",
    steps: [
      { title: "أكمل بيانات الأكاديمية", description: "أضف الاسم وبيانات التواصل واضبط الإعدادات الأساسية.", href: "/onboarding", icon: Rocket },
      { title: "استورد الطلاب", description: "أضف قائمة الطلاب من ملف CSV بدل الإدخال اليدوي.", href: "/students/import", icon: FileSpreadsheet },
      { title: "أنشئ مجموعة وعيّن مدرسًا", description: "نظّم الطلاب حسب المادة أو المرحلة أو الموعد.", href: "/groups", icon: Users },
      { title: "تابع التحليلات", description: "راجع الحضور والواجبات والمدفوعات من لوحة واحدة.", href: "/analytics", icon: GraduationCap },
    ],
  },
  SUPER_ADMIN: {
    title: "شغّل المنصة بثقة",
    description: "راقب نمو الأكاديميات، التفعيل، الإيراد، وحالات الاشتراك التي تحتاج تدخّلًا.",
    steps: [
      { title: "راجع صحة المنصة", description: "تابع الإيراد الشهري والتفعيل وتجارب العملاء من لوحة المنصة.", href: "/platform", icon: Rocket },
      { title: "تابع رحلة العميل", description: "استخدم تحليلات الأكاديميات لمعرفة أين تتعطل التهيئة أو الدعوات.", href: "/analytics", icon: GraduationCap },
      { title: "راجع الخطط والاشتراكات", description: "تأكد من حدود الخطة وحالة اشتراك كل أكاديمية.", href: "/billing", icon: ShieldCheck },
      { title: "أعد أول عميل للنجاح", description: "افتح رحلة تهيئة منظمة لتجربة جديدة أسرع.", href: "/onboarding", icon: Users },
    ],
  },
  TEACHER: {
    title: "نظّم يومك الدراسي",
    description: "ابدأ بمجموعاتك ثم سجّل الحضور والواجبات والدرجات في الترتيب الصحيح.",
    steps: [
      { title: "راجع مجموعاتك", description: "اعرف طلابك والحصص المخصصة لك قبل بداية اليوم.", href: "/groups", icon: Users },
      { title: "سجّل الحضور", description: "وثّق الحضور في نهاية كل حصة للحفاظ على دقة التقارير.", href: "/attendance", icon: CheckCircle2 },
      { title: "أضف واجبًا", description: "انشر تعليمات واضحة وتاريخ تسليم للطلاب.", href: "/homework", icon: BookOpen },
      { title: "انشر الدرجات", description: "شارك النتيجة عبر البوابة؛ لا تكتب التفاصيل الحساسة في الرسائل.", href: "/grades", icon: GraduationCap },
    ],
  },
  PARENT: {
    title: "تابع تقدّم ابنك",
    description: "كل ما تحتاجه للحضور والواجبات والنتائج والمصاريف موجود داخل البوابة.",
    steps: [
      { title: "افتح ملف الابن", description: "راجع الملف التعليمي والبيانات الأساسية لكل ابن على حدة.", href: "/parent/children", icon: Users },
      { title: "راجع الحضور", description: "تابع الحضور ووقت الحصص من دون انتظار رسالة خارجية.", href: "/parent/attendance", icon: CheckCircle2 },
      { title: "تابع الواجبات", description: "تحقق من الواجبات المطلوبة ومواعيدها.", href: "/parent/homework", icon: BookOpen },
      { title: "اطبع التقرير", description: "استخدم تقرير الابن لحفظ نسخة PDF خاصة بك.", href: "/parent/children", icon: FileSpreadsheet },
    ],
  },
  STUDENT: {
    title: "أنجز خطتك الدراسية",
    description: "اعرف حصصك وواجباتك وتقدمك من مكان واحد.",
    steps: [
      { title: "راجع فصولك", description: "اعرف المجموعات المسجل فيها ومحتوى كل مادة.", href: "/student/classes", icon: Users },
      { title: "جهّز للحصة", description: "راجع جدول الحصص القادم قبل الموعد.", href: "/student/lessons", icon: PlayCircle },
      { title: "أنجز واجباتك", description: "تابع المطلوب منك وتواريخ التسليم.", href: "/student/homework", icon: BookOpen },
      { title: "تابع تقدّمك", description: "راجع درجاتك وتطورك الدراسي داخل البوابة.", href: "/student/progress", icon: GraduationCap },
    ],
  },
};

const commonAnswers = [
  ["كيف أحافظ على خصوصية بيانات الطلاب؟", "لا تشارك بيانات الدخول أو تقارير الأبناء، واستخدم البوابة فقط لمتابعة المستخدمين المرتبطين بحسابك."],
  ["كيف أغيّر لغة الواجهة؟", "استخدم زر اللغة في أعلى التطبيق؛ سيتغير الاتجاه تلقائيًا بين العربية والإنجليزية."],
  ["هل يمكن استخدام المنصة من الهاتف؟", "نعم. افتح المنصة من المتصفح، ثم استخدم زر تثبيت التطبيق عند ظهوره لإضافتها إلى الشاشة الرئيسية."],
  ["كيف أتواصل مع الدعم؟", "استخدم مركز الدعم داخل التطبيق لشرح المشكلة، مع تجنب إرسال كلمات المرور أو بيانات دفع كاملة."],
];

export default function HelpPage() {
  const user = getCurrentUser();
  const guide = roleGuides[user?.role ?? "ADMIN"];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مركز المساعدة والتدريب"
        description="خطوات واضحة وسريعة لإنجاز المهام اليومية داخل MY Academy."
      />

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-l from-primary/10 via-background to-background">
        <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Badge variant="secondary" className="mb-3">دليل مخصص لدورك</Badge>
            <h2 className="text-2xl font-bold">{guide.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{guide.description}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <CircleHelp className="h-7 w-7" />
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /><h2 className="font-semibold">خطوات البداية</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {guide.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-4 flex items-start justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><Icon className="h-5 w-5 text-muted-foreground" /></div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                  <Button asChild variant="ghost" className="mt-4 w-full justify-between px-0 text-primary hover:bg-transparent hover:text-primary">
                    <Link href={step.href}>افتح الصفحة <ChevronLeft className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="font-semibold">أسئلة شائعة</h2></div>
            <div className="divide-y">
              {commonAnswers.map(([question, answer]) => (
                <div key={question} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="font-medium">{question}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-500/25 bg-sky-500/5">
          <CardContent className="flex h-full flex-col p-5">
            <Headphones className="h-6 w-6 text-sky-700" />
            <h2 className="mt-4 font-semibold">هل ما زلت تحتاج مساعدة؟</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">اكتب وصفًا واضحًا للمشكلة، وحدد الصفحة التي ظهرت فيها. فريق الدعم سيتابع الطلب من داخل المنصة.</p>
            <Button asChild className="mt-5 w-full"><Link href="/support/tickets"><MessageSquareText className="ml-2 h-4 w-4" />تواصل مع الدعم</Link></Button>
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-muted-foreground">لا ترسل كلمة المرور أو رمز التحقق أو بيانات بطاقتك إلى فريق الدعم.</p>
    </div>
  );
}
