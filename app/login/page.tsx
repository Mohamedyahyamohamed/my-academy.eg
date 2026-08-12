import Link from "next/link";
import { Check } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser, roleHome } from "@/services";
import { redirect } from "next/navigation";

export default function LoginPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const features = [
    "الطلاب والمجموعات والحضور في مكان واحد",
    "المصاريف والفواتير ومتابعة المتأخرات",
    "الدرجات والواجبات وتحليل التقدّم",
    "بوابات للمدرّسين وأولياء الأمور والطلاب",
  ];

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative">
          <Logo className="[&_span]:text-white [&_div]:bg-white/15" />
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            {APP_CONFIG.tagline}.
            <br />
            إدارة أكاديميتك ببساطة وأناقة.
          </h2>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {APP_CONFIG.name}. جميع الحقوق محفوظة.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            أهلاً بعودتك 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            سجّل دخولك لحساب {APP_CONFIG.name} للمتابعة.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            كلمة المرور التجريبية لكل الحسابات:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              demo1234
            </code>
          </p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            جديد عندنا؟{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              سجّل الآن (أكاديمية / ولي أمر / طالب) →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
