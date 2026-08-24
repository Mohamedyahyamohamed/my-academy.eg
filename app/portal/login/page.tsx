import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const dynamic = "force-dynamic";

export default function PortalLoginPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><GraduationCap className="h-6 w-6" /></div>
            <p className="mt-8 text-sm font-semibold text-violet-200">MYAcademy</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">بوابة الطالب وولي الأمر</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-violet-100">دخول واحد ببيانات الاعتماد التي أنشأها مسؤول الأكاديمية، مع مساحة مختلفة حسب الدور المختار.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-violet-100"><ShieldCheck className="h-4 w-4" /> جلسة آمنة ومحددة بالأكاديمية والطالب</div>
        </section>
        <section className="bg-card p-6 text-card-foreground sm:p-10">
          <div className="mb-8 lg:hidden"><p className="text-sm font-semibold text-primary">MYAcademy</p><h1 className="mt-2 text-3xl font-black">بوابة الطالب وولي الأمر</h1></div>
          <div className="mb-7"><h2 className="text-2xl font-bold">تسجيل الدخول</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">استخدم البريد وكلمة المرور اللذين سلّمهما لك مسؤول الأكاديمية.</p></div>
          <PortalLoginForm />
          <p className="mt-8 text-center text-xs text-muted-foreground"><Link href="/" className="hover:text-primary">MYAcademy</Link> · بوابة خاصة غير قابلة للفهرسة</p>
        </section>
      </div>
    </main>
  );
}
