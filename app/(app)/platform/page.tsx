import {
  Activity,
  Banknote,
  Building2,
  Crown,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireScopedRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { PLANS } from "@/services/saas";
import { PlatformAcademyControls, PlatformUserControls, PlatformSubscriptionControls } from "@/components/platform/platform-admin-controls";
import { PlatformUserHierarchy, type PlatformHierarchyAcademy } from "@/components/platform/platform-user-hierarchy";
import { UserPasswordManagement } from "@/components/settings/user-password-management";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const EGP = (value: number, en = false) =>
  new Intl.NumberFormat(en ? "en-EG" : "ar-EG", { maximumFractionDigits: 0 }).format(value || 0) + (en ? " EGP" : " ج.م");
const percent = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator / denominator) * 100) : 0;
const formatDate = (value: string | null | undefined, en = false) =>
  value ? new Date(value).toLocaleDateString(en ? "en-EG" : "ar-EG") : "—";

export default async function PlatformPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  await requireScopedRole("SUPER_ADMIN");
  const searchParams = props.searchParams ? await props.searchParams : {};
  const activeTab = searchParams.tab === "billing" || searchParams.tab === "subscriptions" ? "billing" : searchParams.tab === "users" ? "users" : "overview";
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const client = nodeSupabaseClient();

  const [
    { data: academies },
    { data: subs },
    { data: profiles },
    { data: platformTeachers },
    { data: platformGroups },
    { data: platformGroupAssistants },
    { data: platformGroupStudents },
    { data: platformStudents },
    { data: payments },
    { data: lifecycleEvents },
    { data: billingEvents },
  ] = await Promise.all([
    client.from("academies").select("id,name,workspace_type,created_at,is_active,suspension_reason").order("created_at", { ascending: false }),
    client.from("subscriptions").select("academy_id,plan_id,status,current_period_end,cancel_at_period_end,canceled_at,provider,provider_subscription_id"),
    client.from("profiles").select("id,email,academy_id,role,is_active,full_name"),
    client.from("teachers").select("id,academy_id,profile_id,first_name,last_name,email,is_active"),
    client.from("groups").select("id,academy_id,name,teacher_id"),
    client.from("group_assistants").select("group_id,teacher_id"),
    client.from("group_students").select("group_id,student_id"),
    client.from("students").select("id,academy_id,first_name,last_name,email,status"),
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
  const ownerAcademyId = profileRows.find((profile: any) => profile.role === "SUPER_ADMIN")?.academy_id;
  const managedAcademies = academyRows.filter((academy: any) => academy.id !== ownerAcademyId);
  const managedAcademyIds = new Set(managedAcademies.map((academy: any) => academy.id));
  const academyNameById = new Map(managedAcademies.map((academy: any) => [academy.id, academy.name]));
  const managedPayments = (payments ?? []).filter((row: any) => managedAcademyIds.has(row.academy_id));
  const managedLifecycleEvents = (lifecycleEvents ?? []).filter((row: any) => managedAcademyIds.has(row.academy_id));
  const managedBillingEvents = (billingEvents ?? []).filter((row: any) => managedAcademyIds.has(row.academy_id));
  const managedUsers = profileRows.filter((profile: any) => managedAcademyIds.has(profile.academy_id) && profile.role !== "SUPER_ADMIN");
  const teacherRows: any[] = (platformTeachers ?? []) as any[];
  const groupRows: any[] = (platformGroups ?? []) as any[];
  const assistantRows: any[] = (platformGroupAssistants ?? []) as any[];
  const groupStudentRows: any[] = (platformGroupStudents ?? []) as any[];
  const studentRows: any[] = (platformStudents ?? []) as any[];
  const managedStudents = studentRows.filter((row: any) => managedAcademyIds.has(row.academy_id));
  const managedTeachers = teacherRows.filter((row: any) => managedAcademyIds.has(row.academy_id));
  const profileById = new Map<string, any>(profileRows.map((profile: any) => [profile.id, profile] as [string, any]));
  const teacherById = new Map<string, any>(teacherRows.map((teacher: any) => [teacher.id, teacher] as [string, any]));
  const hierarchyAcademies: PlatformHierarchyAcademy[] = managedAcademies.map((academy: any) => {
    const academyProfiles = profileRows.filter((profile: any) => profile.academy_id === academy.id);
    const academyTeacherRows = teacherRows.filter((teacher: any) => teacher.academy_id === academy.id);
    const academyGroupRows = groupRows.filter((group: any) => group.academy_id === academy.id);
    const owners = academyProfiles
      .filter((profile: any) => profile.role === "ADMIN")
      .map((profile: any) => ({ id: profile.id, name: profile.full_name || profile.email || "Owner", email: profile.email ?? null, role: profile.role, isActive: profile.is_active !== false, teachers: [] }));
    if (owners.length === 0 && academy.workspace_type === "TEACHER") {
      const workspaceOwner = academyProfiles.find((profile: any) => profile.role === "TEACHER") ?? null;
      if (workspaceOwner) owners.push({ id: workspaceOwner.id, name: workspaceOwner.full_name || workspaceOwner.email || "Owner", email: workspaceOwner.email ?? null, role: workspaceOwner.role, isActive: workspaceOwner.is_active !== false, teachers: [] });
    }
    const teachers = academyTeacherRows.map((teacher: any) => {
      const teacherProfile = teacher.profile_id ? profileById.get(teacher.profile_id) : null;
      const teacherGroups = academyGroupRows.filter((group: any) => group.teacher_id === teacher.id).map((group: any) => {
        const students = groupStudentRows.filter((link: any) => link.group_id === group.id).map((link: any) => studentRows.find((student: any) => student.id === link.student_id)).filter(Boolean).map((student: any) => ({ id: student.id, name: `${student.first_name} ${student.last_name}`.trim(), email: student.email ?? null, status: student.status }));
        const assistants = assistantRows.filter((link: any) => link.group_id === group.id).map((link: any) => {
          const assistantTeacher = teacherById.get(link.teacher_id);
          if (!assistantTeacher) return null;
          const assistantProfile = assistantTeacher.profile_id ? profileById.get(assistantTeacher.profile_id) : null;
          const assignedGroups = academyGroupRows.filter((candidate: any) => assistantRows.some((candidateLink: any) => candidateLink.group_id === candidate.id && candidateLink.teacher_id === assistantTeacher.id)).map((candidate: any) => candidate.name);
          return { id: assistantTeacher.id, name: assistantProfile?.full_name || `${assistantTeacher.first_name} ${assistantTeacher.last_name}`.trim(), email: assistantProfile?.email ?? assistantTeacher.email ?? null, groups: assignedGroups };
        }).filter(Boolean);
        return { id: group.id, name: group.name, students, assistants };
      });
      return { id: teacher.id, profileId: teacher.profile_id ?? null, name: teacherProfile?.full_name || `${teacher.first_name} ${teacher.last_name}`.trim(), email: teacherProfile?.email ?? teacher.email ?? null, isActive: teacher.is_active !== false, groups: teacherGroups };
    });
    owners.forEach((owner: any) => { owner.teachers = teachers; });
    return { id: academy.id, name: academy.name, workspaceType: academy.workspace_type, owners, teachers };
  });
  const subscriptionRows = (subs ?? []).filter((row: any) => managedAcademyIds.has(row.academy_id));
  const count = (rows: Array<{ academy_id: string | null }> | null, academyId: string) =>
    (rows ?? []).filter((row) => row.academy_id === academyId).length;
  const sumPaid = (academyId?: string) =>
    managedPayments
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
  const paidAcademies = managedAcademies.filter((academy: any) => priceFor(academy.id).price > 0).length;
  const activatedAcademies = managedAcademies.filter((academy: any) => count(managedStudents, academy.id) > 0).length;
  const completedOnboarding = new Set(
    managedLifecycleEvents
      .filter((event: any) => event.action === "onboarding.complete")
      .map((event: any) => event.academy_id),
  ).size;
  const checkoutAcademies = new Set(
    managedLifecycleEvents
      .filter((event: any) => event.action === "billing.checkout_started")
      .map((event: any) => event.academy_id),
  ).size;
  const convertedAcademies = new Set(managedBillingEvents.map((event: any) => event.academy_id)).size;
  const lastThirtyDays = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newAcademies30d = managedAcademies.filter((academy: any) => new Date(academy.created_at).getTime() >= lastThirtyDays).length;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-l from-violet-950 via-indigo-950 to-slate-950 p-8 shadow-[0_20px_60px_-20px_rgb(109_40_217/0.5)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(139_92_246/0.25),transparent_45%),radial-gradient(circle_at_85%_75%,rgb(56_189_248/0.15),transparent_40%)]" />
        <div aria-hidden className="pointer-events-none absolute -top-16 -end-16 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-amber-600/10 shadow-[0_0_30px_-5px_rgb(251_191_36/0.4)]">
              <Crown className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {en ? "Platform owner dashboard" : "لوحة مالك المنصة"}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-300">
                {en ? "A unified view of growth, activation, revenue, and academies requiring attention." : "صورة تشغيلية موحدة للنمو، التفعيل، الإيراد، والأكاديميات التي تحتاج متابعة."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-300">{en ? "All systems operational" : "كل الأنظمة تعمل"}</span>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b pb-3" aria-label={en ? "Platform sections" : "أقسام المنصة"}>
        <Link href="/platform" className={`rounded-md px-3 py-2 text-sm ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"}`}>{en ? "Overview" : "نظرة عامة"}</Link>
        <Link href="/platform?tab=billing" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activeTab === "billing" ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"}`}><CreditCard className="h-4 w-4" />{en ? "Subscriptions" : "الاشتراكات"}</Link>
        <Link href="/platform?tab=users" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activeTab === "users" ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"}`}><Users className="h-4 w-4" />{en ? "Platform Users" : "مستخدمو المنصة"}</Link>
      </nav>

      {activeTab === "billing" ? (
        <SubscriptionsTab en={en} academies={managedAcademies} subscriptions={subscriptionRows} sumPaid={sumPaid} />
      ) : activeTab === "users" ? (
        <PlatformUsersTab en={en} users={managedUsers.map((profile: any) => ({ id: profile.id, full_name: profile.full_name, email: profile.email ?? (en ? "No email" : "بدون بريد"), role: profile.role, is_active: profile.is_active, academy_name: academyNameById.get(profile.academy_id) ?? null }))} hierarchyAcademies={hierarchyAcademies} />
      ) : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Banknote className="h-4 w-4" />} label={en ? "Actual monthly SaaS revenue" : "إيراد SaaS شهري فعلي"} value={EGP(mrr, en)} hint={`${activeSubscriptions.length} ${en ? "active subscriptions" : "اشتراك نشط"}`} tone="emerald" />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={en ? "Potential revenue after trials" : "إيراد محتمل بعد التجارب"} value={EGP(potentialMrr, en)} hint={`${trialSubscriptions.length} ${en ? "academies on trial" : "أكاديمية في تجربة"}`} tone="violet" />
        <MetricCard icon={<Activity className="h-4 w-4" />} label={en ? "Academy activation" : "تفعيل الأكاديميات"} value={`${percent(activatedAcademies, managedAcademies.length)}%`} hint={en ? `${activatedAcademies} of ${managedAcademies.length} have students` : `${activatedAcademies} من ${managedAcademies.length} لديها طلاب`} tone="sky" />
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
              <FunnelStep label={en ? "New academies" : "أكاديميات جديدة"} value={managedAcademies.length} hint={en ? `${newAcademies30d} in 30 days` : `${newAcademies30d} خلال 30 يوم`} />
              <FunnelStep label={en ? "Completed onboarding" : "أكملت التهيئة"} value={completedOnboarding} hint={`${percent(completedOnboarding, managedAcademies.length)}% ${en ? "of registered academies" : "من المسجلين"}`} />
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
            <OperationalRow label={en ? "Students on platform" : "طلاب على المنصة"} value={`${managedStudents.length}`} />
            <OperationalRow label={en ? "Active teachers" : "مدرسون نشطون"} value={`${managedTeachers.length}`} />
            <OperationalRow label={en ? "Registered users" : "مستخدمون مسجلون"} value={`${managedUsers.length}`} />
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
            {managedAcademies.map((academy: any) => {
              const { plan, price, status, subscription } = priceFor(academy.id);
              const studentCount = count(managedStudents, academy.id);
              const teacherCount = count(managedTeachers, academy.id);
              const atRisk = status === "past_due" || subscription?.cancel_at_period_end || subscription?.canceled_at;
              const suspended = academy.is_active === false;
              return (
                <div key={academy.id} className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-violet-500/5">
                  <Avatar className="border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-sky-500/10 font-bold text-violet-700"><AvatarFallback>{(academy.name || (en ? "A" : "أكاديمية")).slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{academy.name || (en ? "Unnamed academy" : "أكاديمية بلا اسم")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {studentCount} {en ? "students" : "طالب"} · {teacherCount} {en ? "teachers" : "مدرس"} · {en ? "Joined" : "انضمّت"} {formatDate(academy.created_at, en)}
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
            {managedAcademies.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No academies yet." : "لا توجد أكاديميات بعد."}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">{en ? "Platform users" : "مستخدمو المنصة"}</h2>
              <p className="text-xs text-muted-foreground">{en ? "Open the hierarchical view of owners, teachers, assistants, groups, and students." : "افتح العرض الهرمي لمالكي الأكاديميات والمدرسين والمساعدين والمجموعات والطلاب."}</p>
            </div>
            <Link href="/platform?tab=users" className="inline-flex w-fit items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">{en ? "Open platform users" : "فتح مستخدمي المنصة"}</Link>
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
      </>}
    </div>
  );
}

function PlatformUsersTab({ en, users, hierarchyAcademies }: { en: boolean; users: Array<{ id: string; full_name?: string | null; email: string; role: string; is_active: boolean; academy_name?: string | null }>; hierarchyAcademies: PlatformHierarchyAcademy[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{en ? "Platform user management" : "إدارة مستخدمي المنصة"}</h2>
          <p className="text-xs text-muted-foreground">{en ? "Suspend or delete managed accounts without entering an academy workspace." : "يمكنك مراجعة مستخدمي الأكاديميات وإيقاف أو حذف الحسابات من دون الدخول إلى مساحة أكاديمية."}</p>
        </div>
        <UserPasswordManagement lang={en ? "en" : "ar"} users={users} title={en ? "Platform user password management" : "إدارة كلمات مرور مستخدمي المنصة"} description={en ? "Platform owners can reset synthetic academy accounts. Authorization is checked again on the server." : "يمكن لمالك المنصة إعادة تعيين كلمات مرور الحسابات الاصطناعية، مع إعادة فحص الصلاحيات على الخادم."} />
        <PlatformUserHierarchy en={en} academies={hierarchyAcademies} />
        <details className="border-t pt-4">
          <summary className="cursor-pointer text-sm font-medium">{en ? "Administrative account actions" : "إجراءات الحسابات الإدارية"}</summary>
          <p className="mb-3 mt-2 text-xs text-muted-foreground">{en ? "Suspend or delete an account only when required. The hierarchy above remains the primary view." : "أوقف أو احذف حسابًا عند الحاجة فقط. يظل العرض الهرمي بالأعلى هو العرض الأساسي."}</p>
          <PlatformUserControls en={en} users={users} />
        </details>
      </CardContent>
    </Card>
  );
}

function SubscriptionsTab({
  en,
  academies,
  subscriptions,
  sumPaid,
}: {
  en: boolean;
  academies: any[];
  subscriptions: any[];
  sumPaid: (academyId?: string) => number;
}) {
  const subscriptionFor = (academyId: string) => subscriptions.find((item) => item.academy_id === academyId);
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b p-5">
          <h2 className="font-semibold">{en ? "Academy subscriptions" : "اشتراكات الأكاديميات"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{en ? "Review plan, lifecycle status, renewal date, and provider evidence for each academy." : "راجع الخطة والحالة وتاريخ التجديد ودليل مزود الدفع لكل أكاديمية."}</p>
        </div>
        <div className="divide-y">
          {academies.map((academy) => {
            const subscription = subscriptionFor(academy.id);
            const plan = subscription?.plan_id ? PLANS[subscription.plan_id] : PLANS.free;
            const status = subscription?.status ?? "active";
            const atRisk = status === "past_due" || Boolean(subscription?.cancel_at_period_end || subscription?.canceled_at);
            return (
              <div key={academy.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{academy.name || (en ? "Unnamed academy" : "أكاديمية بلا اسم")}</p>
                  <p className="truncate text-xs text-muted-foreground">{en ? "Collected" : "التحصيل"}: {EGP(sumPaid(academy.id), en)}</p>
                </div>
                <div><p className="text-xs text-muted-foreground">{en ? "Plan" : "الخطة"}</p><p className="font-medium">{plan?.name ?? subscription?.plan_id ?? "Free"}</p></div>
                <div><p className="text-xs text-muted-foreground">{en ? "Status" : "الحالة"}</p><Badge variant={atRisk ? "destructive" : status === "active" ? "success" : "secondary"}>{status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">{en ? "Next renewal" : "التجديد القادم"}</p><p className="text-sm">{formatDate(subscription?.current_period_end, en)}</p></div>
                <div><p className="text-xs text-muted-foreground">{en ? "Provider" : "المزود"}</p><p className="text-sm">{subscription?.provider || (subscription?.provider_subscription_id ? (en ? "Configured" : "مهيأ") : (en ? "Not linked" : "غير مرتبط"))}</p></div>
              </div>
            );
          })}
          {academies.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No managed academies yet." : "لا توجد أكاديميات مُدارة بعد."}</p>}
        </div>
        <div className="border-t p-5">
          <h3 className="font-semibold">{en ? "Subscription controls" : "التحكم في الاشتراكات"}</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{en ? "Suspend or reactivate academy service. Stripe subscriptions can also be cancelled at the end of the paid period." : "أوقف أو فعّل خدمة الأكاديمية. ويمكن جدولة إلغاء اشتراكات Stripe في نهاية الفترة المدفوعة."}</p>
          <PlatformSubscriptionControls
            en={en}
            subscriptions={academies.map((academy) => ({
              name: academy.name || (en ? "Unnamed academy" : "أكاديمية بلا اسم"),
              ...(subscriptionFor(academy.id) || { academy_id: academy.id, status: null, provider: null, provider_subscription_id: null, cancel_at_period_end: false, canceled_at: null }),
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: "emerald" | "violet" | "sky" | "amber" }) {
  const tones = {
    emerald: "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-700 shadow-[0_8px_30px_-12px_rgb(16_185_129/0.25)]",
    violet: "border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent text-violet-700 shadow-[0_8px_30px_-12px_rgb(139_92_246/0.25)]",
    sky: "border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent text-sky-700 shadow-[0_8px_30px_-12px_rgb(14_165_233/0.25)]",
    amber: "border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent text-amber-700 shadow-[0_8px_30px_-12px_rgb(245_158_11/0.25)]",
  };
  return <Card className={`premium-card ${tones[tone]}`}><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold">{icon}<span>{label}</span></div><p className="mt-2 bg-gradient-to-l from-slate-900 to-slate-600 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-white dark:to-slate-400">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></CardContent></Card>;
}

function FunnelStep({ label, value, hint, final = false }: { label: string; value: number; hint: string; final?: boolean }) {
  return <div className={`rounded-xl border p-4 transition-colors ${final ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" : "bg-muted/20 hover:bg-muted/40"}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>;
}

function OperationalRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"><span className="text-sm text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
