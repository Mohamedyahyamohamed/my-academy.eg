import {
  Activity,
  Banknote,
  Building2,
  Crown,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireScopedRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { PLANS } from "@/services/saas";

export const dynamic = "force-dynamic";

const EGP = (value: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value || 0) + " ج.م";
const percent = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator / denominator) * 100) : 0;
const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("ar-EG") : "—";

export default async function PlatformPage() {
  await requireScopedRole("SUPER_ADMIN");
  const client = nodeSupabaseClient();

  const [
    { data: academies },
    { data: students },
    { data: teachers },
    { data: subs },
    { data: profiles },
    { data: payments },
    { data: lifecycleEvents },
    { data: billingEvents },
  ] = await Promise.all([
    client.from("academies").select("id,name,created_at").order("created_at", { ascending: false }),
    client.from("students").select("academy_id"),
    client.from("teachers").select("academy_id"),
    client.from("subscriptions").select("academy_id,plan_id,status,cancel_at_period_end,canceled_at"),
    client.from("profiles").select("academy_id,role"),
    client.from("payments").select("academy_id,amount_paid"),
    client
      .from("audit_logs")
      .select("academy_id,action,created_at")
      .in("action", ["academy.create", "onboarding.complete", "billing.checkout_started"])
      .order("created_at", { ascending: false })
      .limit(1000),
    client
      .from("billing_events")
      .select("academy_id,status,processed_at,created_at")
      .eq("status", "processed")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const academyRows = academies ?? [];
  const subscriptionRows = subs ?? [];
  const count = (rows: Array<{ academy_id: string | null }> | null, academyId: string) =>
    (rows ?? []).filter((row) => row.academy_id === academyId).length;
  const sumPaid = (academyId?: string) =>
    (payments ?? [])
      .filter((payment: any) => !academyId || payment.academy_id === academyId)
      .reduce((sum: number, payment: any) => sum + Number(payment.amount_paid || 0), 0);
  const subFor = (academyId: string) => subscriptionRows.find((sub: any) => sub.academy_id === academyId);
  const priceFor = (academyId: string) => {
    const subscription: any = subFor(academyId);
    const plan = subscription?.plan_id ? PLANS[subscription.plan_id] : PLANS.free;
    return { plan, price: plan?.price ?? 0, status: subscription?.status ?? "active", subscription };
  };

  const activeSubscriptions = subscriptionRows.filter((sub: any) => sub.status === "active");
  const trialSubscriptions = subscriptionRows.filter((sub: any) => sub.status === "trialing");
  const atRiskSubscriptions = subscriptionRows.filter(
    (sub: any) => sub.status === "past_due" || sub.cancel_at_period_end || sub.canceled_at,
  );
  const mrr = activeSubscriptions.reduce((sum: number, sub: any) => sum + (PLANS[sub.plan_id]?.price ?? 0), 0);
  const potentialMrr = [...activeSubscriptions, ...trialSubscriptions].reduce(
    (sum: number, sub: any) => sum + (PLANS[sub.plan_id]?.price ?? 0),
    0,
  );
  const paidAcademies = academyRows.filter((academy: any) => priceFor(academy.id).price > 0).length;
  const activatedAcademies = academyRows.filter((academy: any) => count(students, academy.id) > 0).length;
  const completedOnboarding = new Set(
    (lifecycleEvents ?? [])
      .filter((event: any) => event.action === "onboarding.complete")
      .map((event: any) => event.academy_id),
  ).size;
  const checkoutAcademies = new Set(
    (lifecycleEvents ?? [])
      .filter((event: any) => event.action === "billing.checkout_started")
      .map((event: any) => event.academy_id),
  ).size;
  const convertedAcademies = new Set((billingEvents ?? []).map((event: any) => event.academy_id)).size;
  const lastThirtyDays = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newAcademies30d = academyRows.filter((academy: any) => new Date(academy.created_at).getTime() >= lastThirtyDays).length;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="لوحة مالك المنصة"
        description="صورة تشغيلية موحدة للنمو، التفعيل، الإيراد، والأكاديميات التي تحتاج متابعة."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Banknote className="h-4 w-4" />} label="إيراد SaaS شهري فعلي" value={EGP(mrr)} hint={`${activeSubscriptions.length} اشتراك نشط`} tone="emerald" />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="إيراد محتمل بعد التجارب" value={EGP(potentialMrr)} hint={`${trialSubscriptions.length} أكاديمية في تجربة`} tone="violet" />
        <MetricCard icon={<Activity className="h-4 w-4" />} label="تفعيل الأكاديميات" value={`${percent(activatedAcademies, academyRows.length)}%`} hint={`${activatedAcademies} من ${academyRows.length} لديها طلاب`} tone="sky" />
        <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="اشتراكات تحتاج متابعة" value={String(atRiskSubscriptions.length)} hint="متأخرات أو إلغاء مجدول" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">قمع النمو والتحويل</h2>
                <p className="text-xs text-muted-foreground">يعتمد على أحداث التسجيل والتهيئة والفوترة المسجلة في النظام.</p>
              </div>
              <Badge variant="secondary">آخر تحديث: الآن</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <FunnelStep label="أكاديميات جديدة" value={academyRows.length} hint={`${newAcademies30d} خلال 30 يوم`} />
              <FunnelStep label="أكملت التهيئة" value={completedOnboarding} hint={`${percent(completedOnboarding, academyRows.length)}% من المسجلين`} />
              <FunnelStep label="بدأت الدفع" value={checkoutAcademies} hint={`${percent(checkoutAcademies, completedOnboarding)}% من المهيأين`} />
              <FunnelStep label="تحويلات مدفوعة" value={convertedAcademies} hint={`${percent(convertedAcademies, checkoutAcademies)}% من البدايات`} final />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">نظرة تشغيلية</h2>
              <p className="text-xs text-muted-foreground">مقاييس استخدام المنصة عبر كل الأكاديميات.</p>
            </div>
            <OperationalRow label="أكاديميات مدفوعة" value={`${paidAcademies}`} />
            <OperationalRow label="طلاب على المنصة" value={`${students?.length ?? 0}`} />
            <OperationalRow label="مدرسون نشطون" value={`${teachers?.length ?? 0}`} />
            <OperationalRow label="مستخدمون مسجلون" value={`${profiles?.length ?? 0}`} />
            <OperationalRow label="تحصيل أولياء الأمور" value={EGP(sumPaid())} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">الأكاديميات والإيرادات والاستخدام</h2>
              <p className="text-xs text-muted-foreground">ركّز على الأكاديميات غير المفعلة أو التي لديها حالة اشتراك تحتاج متابعة.</p>
            </div>
            <span className="text-xs text-muted-foreground">العملة: جنيه مصري</span>
          </div>
          <div className="divide-y">
            {academyRows.map((academy: any) => {
              const { plan, price, status, subscription } = priceFor(academy.id);
              const studentCount = count(students, academy.id);
              const teacherCount = count(teachers, academy.id);
              const atRisk = status === "past_due" || subscription?.cancel_at_period_end || subscription?.canceled_at;
              return (
                <div key={academy.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar><AvatarFallback>{(academy.name || "أ").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{academy.name || "أكاديمية بلا اسم"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {studentCount} طالب · {teacherCount} مدرس · انضمّت {formatDate(academy.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={studentCount > 0 ? "success" : "secondary"}>{studentCount > 0 ? "مفعّلة" : "تحتاج تهيئة"}</Badge>
                    <Badge variant={atRisk ? "destructive" : status === "active" ? "success" : "secondary"}>
                      {atRisk ? "تحتاج متابعة" : status}
                    </Badge>
                    <Badge variant="secondary">{plan?.name ?? "مجانية"}</Badge>
                    <div className="min-w-28 text-left">
                      <p className="font-semibold text-emerald-700">{EGP(price)}<span className="text-xs font-normal text-muted-foreground">/شهر</span></p>
                      <p className="text-xs text-muted-foreground">تحصيل: {EGP(sumPaid(academy.id))}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {academyRows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد أكاديميات بعد.</p>}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        إيراد SaaS الشهري الفعلي يعتمد على الاشتراكات النشطة فقط. لا تُحسب التجارب ضمنه، وتظهر منفصلة ضمن الإيراد المحتمل.
      </p>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: "emerald" | "violet" | "sky" | "amber" }) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-700",
    sky: "border-sky-500/30 bg-sky-500/5 text-sky-700",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700",
  };
  return <Card className={tones[tone]}><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-medium">{icon}<span>{label}</span></div><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></CardContent></Card>;
}

function FunnelStep({ label, value, hint, final = false }: { label: string; value: number; hint: string; final?: boolean }) {
  return <div className={`rounded-xl border p-4 ${final ? "border-emerald-500/30 bg-emerald-500/5" : "bg-muted/20"}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>;
}

function OperationalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"><span className="text-sm text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
