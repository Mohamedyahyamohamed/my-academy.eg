import Link from "next/link";
import { Check } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { DemoLoginButton } from "@/components/auth/demo-login-button";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser, roleHome } from "@/services";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export default async function LoginPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const features = en
    ? ["Students, groups, and attendance in one place", "Expenses, invoices, and overdue follow-up", "Grades, homework, and progress insights", "Portals for teachers, parents, and students"]
    : ["الطلاب والمجموعات والحضور في مكان واحد", "المصاريف والفواتير ومتابعة المتأخرات", "الدرجات والواجبات وتحليل التقدّم", "بوابات للمدرّسين وأولياء الأمور والطلاب"];

  return (
    <div className="flex min-h-screen bg-background" dir={en ? "ltr" : "rtl"}>
      <div className="auth-info-panel relative hidden w-1/2 flex-col justify-between overflow-hidden border-e border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 p-12 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-slate-950 dark:to-purple-950/40 lg:flex">
        <div>
          <Logo />
        </div>
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{APP_CONFIG.name}</p>
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              {en ? "Run your academy with clarity and ease." : `${APP_CONFIG.tagline}.`}
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              {en ? "Manage your academy with simple, dependable tools." : "إدارة أكاديميتك بأدوات واضحة وعملية."}
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
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <h1 className="text-2xl font-semibold tracking-tight">{en ? "Welcome back" : "أهلاً بعودتك"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{en ? `Sign in to your ${APP_CONFIG.name} account to continue.` : `سجّل دخولك لحساب ${APP_CONFIG.name} للمتابعة.`}</p>
            <div className="mt-6"><LoginForm /></div>
            {(process.env.NODE_ENV !== "production" || process.env.E2E_DEMO_MODE === "true") && (
              <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">{en ? "Try the platform with a demo account" : "جرّب المنصة بحساب تجريبي مباشر"}</p>
                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <p>{en ? "Email:" : "البريد:"} <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">admin@myacademy.edu</code></p>
                  <p>{en ? "Password:" : "كلمة المرور:"} <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">demo1234</code></p>
                </div>
                <DemoLoginButton email="admin@myacademy.edu" password="demo1234" label={en ? "Sign in as demo admin" : "دخول تجريبي كأدمن"} fullWidth className="mt-3" />
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">{en ? "New here?" : "جديد عندنا؟"} <Link href="/signup" className="font-medium text-primary hover:underline">{en ? "Create an account (academy / independent teacher) →" : "سجّل الآن (أكاديمية / مدرس مستقل) →"}</Link></p>
        </div>
      </div>
    </div>
  );
}
