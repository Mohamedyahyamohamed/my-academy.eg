"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, Database, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";
import { formatDateTime } from "@/lib/utils";

type HealthPayload = {
  status?: "healthy" | "degraded";
  checks?: { app?: string; db?: string };
  timestamp?: string;
  latency_ms?: number;
};

type ViewState = "checking" | "healthy" | "degraded" | "unavailable";

export default function StatusPage() {
  const lang = useClientLang();
  const en = lang === "en";
  const [state, setState] = useState<ViewState>("checking");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setState("checking");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as HealthPayload | null;
      setHealth(payload);
      setCheckedAt(new Date().toISOString());
      setState(response.ok && payload?.status === "healthy" ? "healthy" : "degraded");
    } catch {
      setHealth(null);
      setCheckedAt(new Date().toISOString());
      setState("unavailable");
    }
  }, []);

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  const statusCopy = state === "healthy" ? { title: en ? "Service is operating normally" : "الخدمة تعمل بصورة طبيعية", text: en ? "The application and database are responding normally in the latest check." : "تعمل واجهة التطبيق وقاعدة البيانات وفق آخر فحص." } : state === "degraded" ? { title: en ? "Service is operating with a notice" : "الخدمة تعمل مع ملاحظة", text: en ? "Some components need attention. Refresh the check or contact support if the issue continues." : "بعض المكونات تحتاج إلى المتابعة. جرّب تحديث الفحص أو تواصل مع الدعم إذا استمرت المشكلة." } : state === "unavailable" ? { title: en ? "Unable to complete the check" : "تعذر إكمال الفحص", text: en ? "We could not reach the status endpoint. This does not necessarily mean the service is down; please try again shortly." : "لم نتمكن من الوصول إلى نقطة الحالة الآن. هذا لا يثبت توقف الخدمة بالكامل؛ أعد المحاولة بعد لحظات." } : { title: en ? "Checking service status" : "جارٍ فحص الخدمة", text: en ? "We are checking the application and database without exposing operational secrets." : "نختبر التطبيق وقاعدة البيانات دون عرض أي أسرار تشغيلية." };
  const statusTone = state === "healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "degraded" ? "border-amber-200 bg-amber-50 text-amber-900" : state === "unavailable" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-brand-200 bg-brand-50 text-brand-900";
  const StatusIcon = state === "healthy" ? CheckCircle2 : state === "degraded" || state === "unavailable" ? TriangleAlert : Activity;

  return (
    <main dir={en ? "ltr" : "rtl"} className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl"><div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6"><Logo /><div className="flex items-center gap-2"><LanguageToggle /><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/">{en ? "Home" : "الرئيسية"}</Link></Button><Button asChild size="sm"><Link href="/signup">{en ? "Start for free" : "ابدأ مجانًا"} <ArrowRight className="h-4 w-4" /></Link></Button></div></div></header>
      <section className="relative isolate overflow-hidden border-b border-border/60 py-16 sm:py-24"><div className="absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" /><div className="absolute -bottom-40 -right-20 -z-10 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" /><div className="mx-auto max-w-4xl px-4 text-center sm:px-6"><p className="text-sm font-bold text-brand-600">{en ? "Operational transparency" : "شفافية تشغيلية"}</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{en ? "MY Academy service status" : "حالة خدمة MY Academy"}</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{en ? "Check application and database availability directly. We show public indicators only and never expose private keys or data." : "تحقق من توفر التطبيق وقاعدة البيانات مباشرة. نعرض مؤشرات عامة فقط ولا نكشف أي مفاتيح أو بيانات خاصة."}</p><div className={`mx-auto mt-10 flex max-w-2xl items-start gap-4 rounded-2xl border p-5 text-right shadow-sm ${statusTone}`}><StatusIcon className="mt-0.5 h-6 w-6 shrink-0" /><div className="min-w-0 flex-1"><h2 className="font-black">{statusCopy.title}</h2><p className="mt-1 text-sm leading-6 opacity-80">{statusCopy.text}</p>{health?.latency_ms !== undefined && <p className="mt-2 text-xs opacity-70">{en ? "Check latency:" : "زمن الفحص:"} {health.latency_ms} {en ? "ms" : "مللي ثانية"}</p>}</div><Button type="button" variant="outline" size="sm" onClick={() => void checkStatus()} disabled={state === "checking"} className="shrink-0 bg-white/70"><RefreshCw className={`h-4 w-4 ${state === "checking" ? "animate-spin" : ""}`} /></Button></div></div></section>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20"><div className="grid gap-4 md:grid-cols-2"><StatusCard icon={Activity} title={en ? "Application" : "التطبيق"} value={health?.checks?.app === "ok" ? (en ? "Operational" : "يعمل") : state === "checking" ? (en ? "Checking" : "جارٍ الفحص") : (en ? "Needs attention" : "يحتاج متابعة")} ok={health?.checks?.app === "ok"} /><StatusCard icon={Database} title={en ? "Database" : "قاعدة البيانات"} value={(health?.checks?.db === "ok" || health?.checks?.db?.startsWith("not-configured")) ? (en ? "Available" : "متاحة") : state === "checking" ? (en ? "Checking" : "جارٍ الفحص") : (en ? "Needs attention" : "تحتاج متابعة")} ok={(health?.checks?.db === "ok" || health?.checks?.db?.startsWith("not-configured"))} /></div><div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 sm:p-8"><div className="flex items-start gap-4"><ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-brand-600" /><div><h2 className="font-black">{en ? "What do we measure?" : "ما الذي نقيسه؟"}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{en ? "The public indicator checks application response and database connectivity only. It does not guarantee every external integration such as payments or messaging, and it never exposes user records or internal infrastructure details." : "يفحص المؤشر العام استجابة التطبيق واتصال قاعدة البيانات فقط. لا يُعد هذا التقرير ضمانًا لنجاح كل تكامل خارجي مثل الدفع أو الرسائل، ولا يعرض سجلات المستخدمين أو تفاصيل البنية الداخلية."}</p>{checkedAt && <p className="mt-4 text-xs text-muted-foreground">{en ? "Last check from your browser:" : "آخر فحص من متصفحك:"} {formatDateTime(checkedAt, en ? "en-US" : "ar-EG")}</p>}</div></div></div><div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild variant="outline" className="rounded-xl"><Link href="/pricing">{en ? "Review pricing" : "مراجعة الأسعار"}</Link></Button><Button asChild className="rounded-xl"><Link href="/signup">{en ? "Start for free" : "ابدأ مجانًا"} <ArrowRight className="h-4 w-4" /></Link></Button></div></section>
      <footer className="border-t border-border py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6"><Logo /><p>© {new Date().getFullYear()} MY Academy. {en ? "All rights reserved." : "جميع الحقوق محفوظة."}</p><div className="flex gap-4"><Link href="/privacy" className="transition hover:text-foreground">{en ? "Privacy" : "الخصوصية"}</Link><Link href="/pricing" className="transition hover:text-foreground">{en ? "Pricing" : "الأسعار"}</Link><Link href="/" className="transition hover:text-foreground">{en ? "Home" : "الرئيسية"}</Link></div></div></footer>
    </main>
  );
}

function StatusCard({ icon: Icon, title, value, ok }: { icon: typeof Activity; title: string; value: string; ok?: boolean }) {
  return <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></div><div className="flex-1"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 font-black">{value}</p></div>{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}</div>;
}
