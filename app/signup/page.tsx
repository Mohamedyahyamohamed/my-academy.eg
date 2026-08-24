import Link from "next/link";
import { Check } from "lucide-react";
import { cookies } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser, roleHome } from "@/services";
import { getLangFromCookie, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));
  const lang: Lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const features = en
    ? ["Students, groups, and attendance in one place", "Expenses, invoices, and overdue follow-up", "Grades, homework, and progress insights", "Portals for teachers, parents, and students"]
    : ["الطلاب والمجموعات والحضور في مكان واحد", "المصاريف والفواتير ومتابعة المتأخرات", "الدرجات والواجبات وتحليل التقدّم", "بوابات للمدرّسين وأولياء الأمور والطلاب"];

  return (
    <div className="flex min-h-screen bg-background" dir={en ? "ltr" : "rtl"}>
      <div className="auth-info-panel relative hidden w-1/2 flex-col justify-between overflow-hidden border-e border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 p-12 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-slate-950 dark:to-purple-950/40 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,hsl(252_58%_46%_/_0.10),transparent_30%),radial-gradient(circle_at_85%_80%,hsl(190_80%_45%_/_0.08),transparent_28%)]" />
        <div><Logo /></div>
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{APP_CONFIG.name}</p>
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              {en ? "Start your academy in minutes." : "ابدأ أكاديميتك في دقائق."}
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              {en ? "Free to start — no credit card required." : "ابدأ مجانًا — دون بطاقة ائتمان."}
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {APP_CONFIG.name}. {en ? "All rights reserved." : "جميع الحقوق محفوظة."}</p>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className={`absolute top-4 ${en ? "right-4" : "left-4"}`}><LanguageToggle /></div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <h1 className="text-2xl font-semibold tracking-tight">{en ? "Create your workspace" : "أنشئ مساحتك"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{en ? "Choose what fits you: manage a full academy or create an independent teacher workspace." : "اختر ما يناسبك: إدارة أكاديمية كاملة أو إنشاء مساحة مدرس مستقلة."}</p>
            <div className="mt-6"><SignupForm initialLang={lang} /></div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">{en ? "Already have an account?" : "عندك حساب بالفعل؟"}{" "}<Link href="/login" className="font-medium text-primary hover:underline">{en ? "Sign in →" : "تسجيل الدخول ←"}</Link></p>
        </div>
      </div>
    </div>
  );
}
