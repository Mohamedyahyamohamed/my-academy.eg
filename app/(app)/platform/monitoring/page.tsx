import { Activity, AlertTriangle, Database, HardDrive, KeyRound, RefreshCw, Server, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireScopedRole } from "@/services";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";
import { isSupabaseConfigured, getSupabaseAnonKey, getSupabaseUrl } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { getObservabilitySnapshot, type StoredError } from "@/lib/error-trace";

export const dynamic = "force-dynamic";

async function checkHealth() {
  const supabaseReady = Boolean(getSupabaseUrl() && getSupabaseAnonKey() && isSupabaseConfigured());
  const client = supabaseReady ? nodeSupabaseClient() : null;
  const checks: Record<string, string> = {
    app: "ok",
    qr: process.env.QR_SESSION_SECRET && process.env.QR_SESSION_SECRET.length >= 32 ? "ok" : "unavailable",
  };
  if (!client) {
    checks.db = "not-configured";
    checks.auth = "not-configured";
    checks.storage = "not-configured";
  } else {
    try {
      const { error } = await client.from("academies").select("id").limit(1);
      checks.db = error ? "query-failed" : "ok";
    } catch { checks.db = "unavailable"; }
    try {
      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.auth = error ? "auth-error" : "ok";
    } catch { checks.auth = "auth-error"; }
    try {
      const { error } = await client.storage.listBuckets();
      checks.storage = error ? "storage-error" : "ok";
    } catch { checks.storage = "storage-error"; }
  }
  return checks;
}

const STATUS_TONE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  degraded: "bg-amber-50 text-amber-800 border-amber-200",
  unavailable: "bg-rose-50 text-rose-700 border-rose-200",
  "not-configured": "bg-slate-100 text-slate-600 border-slate-200",
  "query-failed": "bg-rose-50 text-rose-700 border-rose-200",
  "auth-error": "bg-rose-50 text-rose-700 border-rose-200",
  "storage-error": "bg-rose-50 text-rose-700 border-rose-200",
  "invalid-credentials": "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function PlatformMonitoringPage() {
  await requireScopedRole("SUPER_ADMIN");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const checks = await checkHealth();
  const obs = getObservabilitySnapshot();

  const components = [
    { key: "app", label: en ? "Application" : "التطبيق", icon: Activity },
    { key: "db", label: en ? "Database" : "قاعدة البيانات", icon: Database },
    { key: "auth", label: en ? "Auth" : "الحسابات", icon: KeyRound },
    { key: "storage", label: en ? "Storage" : "التخزين", icon: HardDrive },
    { key: "qr", label: en ? "QR sessions" : "جلسات QR", icon: Server },
  ];

  return (
    <div dir={en ? "ltr" : "rtl"} className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title={en ? "Internal Monitoring" : "المراقبة الداخلية"}
        description={en ? "Live dependency health, recent errors, and rate-limit rejections." : "صحة المكونات الحية، الأخطاء الأخيرة، وطلبات مقيدة بـ 429."}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/platform">{en ? "Back to platform" : "رجوع للمنصة"}</Link>
        </Button>
      </PageHeader>

      {/* Dependency health */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((c) => {
          const status = checks[c.key] ?? "unavailable";
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <Badge variant="outline" className={`mt-1 ${STATUS_TONE[status] ?? ""}`}>{status}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Observability summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{en ? "Errors (last hour)" : "الأخطاء (آخر ساعة)"}</p>
          <p className="mt-1 text-2xl font-black">{obs.errors_last_hour}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{en ? "Rate-limited (429)" : "محدودة (429)"}</p>
          <p className="mt-1 text-2xl font-black">{obs.rate_limited_hits}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{en ? "Uptime" : "مدة التشغيل"}</p>
          <p className="mt-1 text-2xl font-black">{Math.round(obs.uptime_ms / 60000)} {en ? "min" : "دقيقة"}</p>
        </CardContent></Card>
      </div>

      {/* Recent errors */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <h2 className="font-black">{en ? "Recent errors" : "الأخطاء الأخيرة"}</h2>
            <Badge variant="secondary" className="ms-auto">{obs.total_errors_stored}</Badge>
          </div>
          {obs.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{en ? "No errors recorded in this server session." : "لا توجد أخطاء مسجلة في هذه الجلسة."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-2 text-start">{en ? "Time" : "الوقت"}</th>
                    <th className="px-2 py-2 text-start">{en ? "Path" : "المسار"}</th>
                    <th className="px-2 py-2 text-start">{en ? "Role" : "الدور"}</th>
                    <th className="px-2 py-2 text-start">{en ? "Scope" : "النطاق"}</th>
                    <th className="px-2 py-2 text-start">{en ? "Severity" : "الخطورة"}</th>
                    <th className="px-2 py-2 text-start">{en ? "Message" : "الرسالة"}</th>
                  </tr>
                </thead>
                <tbody>
                  {obs.recent.map((e: StoredError, i: number) => (
                    <tr key={i} className="border-b last:border-0 align-top">
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString(en ? "en-EG" : "ar-EG")}</td>
                      <td className="px-2 py-2 font-mono text-xs">{e.path ?? "—"}</td>
                      <td className="px-2 py-2 text-xs">{e.role ?? "—"}</td>
                      <td className="px-2 py-2 text-xs">{e.scope ?? "—"}</td>
                      <td className="px-2 py-2"><Badge variant={e.severity === "critical" ? "destructive" : e.severity === "error" ? "warning" : "outline"}>{e.severity}</Badge></td>
                      <td className="px-2 py-2 text-xs">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            {en ? "In-memory only — resets on server restart. Wire to Supabase/Logflare for durable retention." : "في الذاكرة فقط — يُمسح عند إعادة تشغيل السيرفر. اربطه بـ Supabase للاحتفاظ الدائم."}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link href="/status"><RefreshCw className="h-4 w-4" /> {en ? "Public status page" : "صفحة الحالة العامة"}</Link>
        </Button>
      </div>
    </div>
  );
}
