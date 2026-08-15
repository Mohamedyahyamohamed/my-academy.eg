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
  const features = en ? ["Students, groups, and attendance in one place", "Expenses, invoices, and overdue follow-up", "Grades, homework, and progress insights", "Portals for teachers, parents, and students"] : ["الطلاب والمجموعات والحضور في مكان واحد", "المصاريف والفواتير ومتابعة المتأخرات", "الدرجات والواجبات وتحليل التقدّم", "بوابات للمدرّسين وأولياء الأمور والطلاب"];

  return <div className="flex min-h-screen" dir={en ? "ltr" : "rtl"}>
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex"><div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} /><div className="relative"><Logo className="[&_span]:text-white [&_div]:bg-white/15" /></div><div className="relative space-y-6"><h2 className="text-3xl font-semibold leading-tight">{en ? "Run your academy with clarity and ease." : `${APP_CONFIG.tagline}.`}<br />{en ? "Manage your academy with simplicity and style." : "إدارة أكاديميتك ببساطة وأناقة."}</h2><ul className="space-y-3">{features.map((f) => <li key={f} className="flex items-center gap-3 text-white/90"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><Check className="h-3 w-3" strokeWidth={3} /></span><span className="text-sm">{f}</span></li>)}</ul></div><p className="relative text-xs text-white/60">© {new Date().getFullYear()} {APP_CONFIG.name}. {en ? "All rights reserved." : "جميع الحقوق محفوظة."}</p></div>
    <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2"><div className={`absolute top-4 ${en ? "right-4" : "left-4"}`}><LanguageToggle /></div><div className="w-full max-w-sm"><div className="mb-8 lg:hidden"><Logo /></div><h1 className="text-2xl font-semibold tracking-tight">{en ? "Welcome back" : "أهلاً بعودتك"}</h1><p className="mt-1.5 text-sm text-muted-foreground">{en ? `Sign in to your ${APP_CONFIG.name} account to continue.` : `سجّل دخولك لحساب ${APP_CONFIG.name} للمتابعة.`}</p><div className="mt-6"><LoginForm /></div>{(process.env.NODE_ENV !== "production" || process.env.E2E_DEMO_MODE === "true") && <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center"><p className="text-xs font-medium text-muted-foreground">{en ? "Try the platform with a demo account" : "جرّب المنصة بحساب تجريبي مباشر"}</p><div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground"><p>{en ? "Email:" : "البريد:"} <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">admin@myacademy.edu</code></p><p>{en ? "Password:" : "كلمة المرور:"} <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">demo1234</code></p></div><DemoLoginButton email="admin@myacademy.edu" password="demo1234" label={en ? "Sign in as demo admin" : "دخول تجريبي كأدمن"} fullWidth className="mt-3" /></div>}<p className="mt-3 text-center text-sm text-muted-foreground">{en ? "New here?" : "جديد عندنا؟"} <Link href="/signup" className="font-medium text-primary hover:underline">{en ? "Create an account (academy / independent teacher) →" : "سجّل الآن (أكاديمية / مدرس مستقل) →"}</Link></p></div></div>
  </div>;
}
