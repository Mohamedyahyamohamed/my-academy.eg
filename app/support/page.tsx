import Link from "next/link";
import { ArrowLeft, LifeBuoy, LockKeyhole, MessageSquareText } from "lucide-react";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { getLangFromCookie, LANG_COOKIE, type Lang } from "@/lib/i18n";

const copy: Record<Lang, { title: string; topics: Array<{ title: string; description: string }>; eyebrow: string; intro: string; login: string; followTitle: string; followText: string; openTicket: string }> = {
  ar: { title: "مركز مساعدة MY Academy", topics: [{ title: "تسجيل الدخول واستعادة كلمة المرور", description: "استخدم صفحة الدخول أو اطلب رابطًا جديدًا لاستعادة كلمة المرور من بريدك الإلكتروني." }, { title: "إدارة الأكاديمية", description: "بعد تسجيل الدخول يستطيع المدير إدارة الطلاب والمجموعات والحضور والدرجات والمدفوعات." }, { title: "البوابات التعليمية", description: "لكل مدرس وولي أمر وطالب بوابة مخصصة حسب الصلاحيات المسجلة في الأكاديمية." }], eyebrow: "مركز مساعدة MY Academy", intro: "تعرّف على المسارات الأساسية، وإذا احتجت متابعة خاصة بأكاديميتك سجّل الدخول لفتح طلب دعم آمن.", login: "تسجيل الدخول", followTitle: "هل تحتاج إلى متابعة من فريق الدعم؟", followText: "سجّل الدخول أولًا حتى نربط الطلب بالأكاديمية والحساب الصحيح ونحافظ على خصوصية بيانات الطلاب.", openTicket: "الدخول وفتح تذكرة" },
  en: { title: "MY Academy help center", topics: [{ title: "Login and password recovery", description: "Use the login page or request a new recovery link from your email." }, { title: "Academy management", description: "After signing in, administrators can manage students, groups, attendance, grades, and payments." }, { title: "Learning portals", description: "Teachers, parents, and students each receive a portal based on their academy permissions." }], eyebrow: "MY Academy help center", intro: "Learn the essential paths, and sign in to open a secure support request for your academy when you need personal assistance.", login: "Sign in", followTitle: "Need help from the support team?", followText: "Sign in first so we can connect the request to the right academy and account while protecting student privacy.", openTicket: "Sign in and open a ticket" },
};

export const metadata = { title: "MY Academy Support" };

export default async function PublicSupportPage() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const t = copy[lang];
  const isRTL = lang === "ar";
  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-gradient-to-l from-brand-700 to-brand-500 p-8 text-white shadow-sm sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-brand-100"><LifeBuoy className="h-5 w-5" /><span className="text-sm font-medium">{t.eyebrow}</span></div><h1 className="text-3xl font-bold tracking-tight">{isRTL ? "نساعدك تبدأ وتستخدم المنصة بسهولة" : "We help you start and use the platform with ease"}</h1><p className="mt-3 text-sm leading-7 text-brand-50">{t.intro}</p></div><Button asChild variant="secondary" className="shrink-0"><Link href="/login">{t.login}<ArrowLeft className="ms-2 h-4 w-4" /></Link></Button></div></section>
      <section className="grid gap-4 md:grid-cols-3">{t.topics.map((topic) => <article key={topic.title} className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">{topic.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.description}</p></article>)}</section>
      <section className="rounded-2xl border bg-muted/30 p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><MessageSquareText className="h-5 w-5" /></div><div><h2 className="font-semibold">{t.followTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t.followText}</p><Button asChild className="mt-4"><Link href="/login">{t.openTicket}<LockKeyhole className="ms-2 h-4 w-4" /></Link></Button></div></div></section>
    </main>
  );
}
