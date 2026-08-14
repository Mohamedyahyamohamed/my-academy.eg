import Link from "next/link";
import { cookies } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { getCurrentUser, roleHome } from "@/services";
import { getLangFromCookie, isRTL, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));
  const lang: Lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12" dir={isRTL(lang) ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageToggle /></div>
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="card-surface p-8">
          <h1 className="text-xl font-semibold tracking-tight">{en ? "Get started with MYAcademy" : "ابدأ باستخدام MYAcademy"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{en ? "Choose what fits you: manage a full academy or create an independent teacher workspace for your students and groups." : "اختر ما يناسبك: إدارة أكاديمية كاملة أو إنشاء مساحة مدرس مستقلة لإدارة طلابك ومجموعاتك."}</p>
          <div className="mt-6"><SignupForm initialLang={lang} /></div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{en ? "Already have an account?" : "عندك حساب بالفعل؟"}{" "}<Link href="/login" className="font-medium text-primary hover:underline">{en ? "Sign in" : "تسجيل الدخول"}</Link></p>
      </div>
    </div>
  );
}
