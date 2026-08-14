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
import { PlatformAcademyControls, PlatformUserControls } from "@/components/platform/platform-admin-controls";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const EGP = (value: number, en = false) =>
  new Intl.NumberFormat(en ? "en-EG" : "ar-EG", { maximumFractionDigits: 0 }).format(value || 0) + (en ? " EGP" : " ج.م");
const percent = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator / denominator) * 100) : 0;
const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("ar-EG") : "—";

export default async function PlatformPage() {
  await requireScopedRole("SUPER_ADMIN");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
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
    client.from("academies").select("id,name,created_at,is_active,suspension_reason").order("created_at", { ascending: false }),
    client.from("students").select("academy_id"),
    client.from("teachers").select("academy_id"),
    client.from("subscriptions").select("academy_id,plan_id,status,cancel_at_period_end,canceled_at"),
    client.from("profiles").select("id,email,academy_id,role,is_active"),
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
  const profileRows = profiles ?? [];
  const ownerAcademyId = profileRows.find((profile: any) => profile.email?.toLowerCase() === "mohamedyahya13579@gmail.com")?.academy_id;
  const managedAcademies = academyRows.filter((academy: any) => academy.id !== ownerAcademyId);
  const managedUsers = profileRows.filter((profile: any) => profile.email?.toLowerCase() !== "mohamedyahya13579@gmail.com" && profile.role !== "SUPER_ADMIN");
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
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Platform owner dashboard" : "لوحة مالك المنصة"}
        description={en ? "A unified view of growth, activation, revenue, and academies requiring attention." : "صورة تشغيلية موحدة للنمو، التفعيل، الإيراد، والأكاديميات التي تحتاج متابعة."}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Banknote className="h-4 w-4" />} label={en ? "Actual monthly SaaS revenue" : "إيراد SaaS شهري فعلي"} value={EGP(mrr, en)} hint={`${activeSubscriptions.length} ${en ? "active subscriptions" : "اشتراك نشط"}`} tone="emerald" />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={en ? "Potential revenue after trials" : "إيراد محتمل بعد التجارب"} value={EGP(potentialMrr, en)} hint={`${trialSubscriptions.length} ${en ? "academies on trial" : "أكاديمية في تجربة"}`} tone="violet" />
        <MetricCard icon={<Activity className="h-4 w-4" />} label={en ? "Academy activation" : "تفعيل الأكاديميات"} value={`${percent(activatedAcademies, academyRows.length)}%`} hint={en ? `${activatedAcademies} of ${academyRows.length} have students` : `${activatedAcademies} من ${academyRows.length} لديها طلاب`} tone="sky" />
        <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label={en ? "Subscriptions needing attention" : "اشتراكات تحتاج متابعة"} value={String(atRiskSubscriptions.length)} hint={en ? "Past due or scheduled cancellation" : "متأخرات أو إلغاء مجدول"} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{en ? "Growth and conversion funnel" : "قمع النمو والتحويل"}</h2>
                <p className="text-xs text-muted-foreground">{en ? "Based on registration, onboarding, and billing events recorded in the system." : "يعتمد على أحداث التسجيل والتهيئة والفوترة المسجلة في النظام."}</p>
              </div>
              <Badge variant="secondary">{en ? "Updated: now" : "آخر تحديث: الآن"}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <FunnelStep label={en ? "New academies" : "أكاديميات جديدة"} value={academyRows.length} hint={en ? `${newAcademies30d} in 30 days` : `${newAcademies30d} خلال 30 يوم`} />
              <FunnelStep label={en ? "Completed onboarding" : "أكملت التهيئة"} value={completedOnboarding} hint={`${percent(completedOnboarding, academyRows.length)}% ${en ? "of registered academies" : "من المسجلين"}`} />
              <FunnelStep label={en ? "Started checkout" : "بدأت الدفع"} value={checkoutAcademies} hint={`${percent(checkoutAcademies, completedOnboarding)}% ${en ? "of onboarded" : "من المهيأين"}`} />
              <FunnelStep label={en ? "Paid conversions" : "تحويلات مدفوعة"} value={convertedAcademies} hint={`${percent(convertedAcademies, checkoutAcademies)}% ${en ? "of checkouts" : "من البدايات"}`} final />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">{en ? "Operational overview" : "نظرة تشغيلية"}</h2>
              <p className="text-xs text-muted-foreground">{en ? "Platform usage metrics across all academies." : "مقاييس استخدام المنصة عبر كل الأكاديميات."}</p>
            </div>
            <OperationalRow label={en ? "Paid academies" : "أكاديميات مدفوعة"} value={`${paidAcademies}`} />
            <OperationalRow label={en ? "Students on platform" : "طلاب على المنصة"} value={`${students?.length ?? 0}`} />
            <OperationalRow label={en ? "Active teachers" : "مدرسون نشطون"} value={`${teachers?.length ?? 0}`} />
            <OperationalRow label={en ? "Registered users" : "مستخدمون مسجلون"} value={`${profileRows.length}`} />
            <OperationalRow label={en ? "Parent collections" : "تحصيل أولياء الأمور"} value={EGP(sumPaid(), en)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">{en ? "Academies, revenue, and usage" : "الأكاديميات والإيرادات والاستخدام"}</h2>
              <p className="text-xs text-muted-foreground">{en ? "Focus on inactive academies or subscriptions needing attention." : "ركّز على الأكاديميات غير المفعلة أو التي لديها حالة اشتراك تحتاج متابعة."}</p>
            </div>
            <span className="text-xs text-muted-foreground">{en ? "Currency: Egyptian pound" : "العملة: جنيه مصري"}</span>
          </div>
          <div className="divide-y">
            {academyRows.map((academy: any) => {
              const { plan, price, status, subscription } = priceFor(academy.id);
              const studentCount = count(students, academy.id);
              const teacherCount = count(teachers, academy.id);
              const atRisk = status === "past_due" || subscription?.cancel_at_period_end || subscription?.canceled_at;
              const suspended = academy.is_active === false;
              return (
                <div key={academy.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar><AvatarFallback>{(academy.name || "أ").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{academy.name || "أكاديمية بلا اسم"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {studentCount} {en ? "students" : "طالب"} · {teacherCount} {en ? "teachers" : "مدرس"} · {en ? "Joined" : "انضمّت"} {formatDate(academy.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={suspended ? "destructive" : studentCount > 0 ? "success" : "secondary"}>{suspended ? (en ? "Suspended" : "موقوفة") : studentCount > 0 ? (en ? "Active" : "مفعّلة") : (en ? "Needs setup" : "تحتاج تهيئة")}</Badge>
                    <Badge variant={atRisk ? "destructive" : status === "active" ? "success" : "secondary"}>
                      {atRisk ? (en ? "Needs attention" : "تحتاج متابعة") : status}
                    </Badge>
                    <Badge variant="secondary">{plan?.name ?? (en ? "Free" : "مجانية")}</Badge>
                    <div className="min-w-28 text-left">
                      <p className="font-semibold text-emerald-700">{EGP(price, en)}<span className="text-xs font-normal text-muted-foreground">/{en ? "month" : "شهر"}</span></p>
                      <p className="text-xs text-muted-foreground">{en ? "Collected:" : "تحصيل:"} {EGP(sumPaid(academy.id), en)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {academyRows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No academies yet." : "لا توجد أكاديميات بعد."}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">{en ? "Platform-wide user management" : "إدارة المستخدمين على مستوى المنصة"}</h2>
              <p className="text-xs text-muted-foreground">{en ? "Suspend or delete any account except the platform owner." : "يمكنك إيقاف أو حذف أي حساب، باستثناء حساب مالك المنصة."}</p>
            </div>
            <PlatformUserControls en={en} users={managedUsers.map((profile: any) => ({ id: profile.id, email: profile.email, role: profile.role, is_active: profile.is_active }))} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">{en ? "Academy management" : "إدارة الأكاديميات"}</h2>
              <p className="text-xs text-muted-foreground">{en ? "Deleting an academy permanently deletes its data; the owner's academy remains protected." : "حذف الأكاديمية يحذف بياناتها التابعة نهائيًا، بينما تظل أكاديمية المالك محمية."}</p>
            </div>
            <PlatformAcademyControls en={en} academies={managedAcademies.map((academy: any) => ({ id: academy.id, name: academy.name, is_active: academy.is_active !== false }))} />
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {en ? "Actual monthly SaaS revenue includes active subscriptions only. Trials are shown separately as potential revenue." : "إيراد SaaS الشهري الفعلي يعتمد على الاشتراكات النشطة فقط. لا تُحسب التجارب ضمنه، وتظهر منفصلة ضمن الإيراد المحتمل."}
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
