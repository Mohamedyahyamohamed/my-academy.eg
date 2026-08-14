import Link from "next/link";
import { ArrowLeft, LifeBuoy, LockKeyhole, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "الدعم والمساعدة · MY Academy" };

const topics = [
  {
    title: "تسجيل الدخول واستعادة كلمة المرور",
    description: "استخدم صفحة الدخول أو اطلب رابطًا جديدًا لاستعادة كلمة المرور من بريدك الإلكتروني.",
  },
  {
    title: "إدارة الأكاديمية",
    description: "بعد تسجيل الدخول يستطيع المدير إدارة الطلاب والمجموعات والحضور والدرجات والمدفوعات.",
  },
  {
    title: "البوابات التعليمية",
    description: "لكل مدرس وولي أمر وطالب بوابة مخصصة حسب الصلاحيات المسجلة في الأكاديمية.",
  },
];

export default function PublicSupportPage() {
  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-gradient-to-l from-brand-700 to-brand-500 p-8 text-white shadow-sm sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-brand-100">
              <LifeBuoy className="h-5 w-5" />
              <span className="text-sm font-medium">مركز مساعدة MY Academy</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">نساعدك تبدأ وتستخدم المنصة بسهولة</h1>
            <p className="mt-3 text-sm leading-7 text-brand-50">
              تعرّف على المسارات الأساسية، وإذا احتجت متابعة خاصة بأكاديميتك سجّل الدخول لفتح طلب دعم آمن.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/login">
              تسجيل الدخول
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {topics.map((topic) => (
          <article key={topic.title} className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">{topic.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border bg-muted/30 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">هل تحتاج إلى متابعة من فريق الدعم؟</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              سجّل الدخول أولًا حتى نربط الطلب بالأكاديمية والحساب الصحيح ونحافظ على خصوصية بيانات الطلاب.
            </p>
            <Button asChild className="mt-4">
              <Link href="/login">
                الدخول وفتح تذكرة
                <LockKeyhole className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
