import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireScopedRole } from "@/services";
import { listPlans, getPlan, getUsage, getSubscriptionStatus } from "@/services/saas";
import { formatCurrency } from "@/lib/utils";
import { PlanCheckoutButton } from "@/components/billing/plan-checkout-button";
import { Check, Sparkles } from "lucide-react";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { measureStorageUsage } from "@/lib/storage-quota";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLangFromCookie } from "@/lib/i18n";
import { getAcademyAsync } from "@/services/misc";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const currentUser = await requireScopedRole("ADMIN", "TEACHER");
  if (currentUser.role === "SUPER_ADMIN") redirect("/platform");
  const academy = await getAcademyAsync(currentUser.academy_id);
  const workspaceType = academy.workspace_type === "TEACHER" ? "TEACHER" : "ACADEMY";
  // A TEACHER role inside an academy may teach, but cannot manage the academy subscription.
  // The TEACHER role can access billing only when it owns an independent teacher workspace.
  if (currentUser.role === "TEACHER" && workspaceType === "ACADEMY") redirect("/teacher");
  const isTeacherWorkspace = workspaceType === "TEACHER";
  const plans = listPlans(workspaceType);
  const currentPlan = getPlan(currentUser.academy_id);
  const usage = await getUsage(currentUser.academy_id);
  const sub = getSubscriptionStatus(currentUser.academy_id);
  const storageResult = nodeSupabaseClient()
    ? await measureStorageUsage(nodeSupabaseClient()!, "homework", currentUser.academy_id)
    : { ok: false as const, error: "Storage is not configured." };
  const storageUsedMb = storageResult.ok ? storageResult.bytes / (1024 * 1024) : null;
  const renewalDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  const usageItems = [
    { label: en ? "Students" : "الطلاب", current: usage.students, limit: currentPlan.maxStudents },
    ...(isTeacherWorkspace ? [] : [{ label: en ? "Teachers" : "المدرسون", current: usage.teachers, limit: currentPlan.maxTeachers }]),
    { label: en ? "Groups" : "المجموعات", current: usage.groups, limit: currentPlan.maxGroups },
  ];

  const formatStorage = (mb: number) => mb >= 1024 ? `${mb / 1024} ${en ? "GB" : "جيجابايت"}` : `${mb} ${en ? "MB" : "ميجابايت"}`;
  const title = isTeacherWorkspace
    ? (en ? "Teacher plans and billing" : "خطط المدرسين والفوترة")
    : (en ? "Academy plans and billing" : "خطط الأكاديميات والفوترة");
  const description = isTeacherWorkspace
    ? (en ? "Choose a plan based on your student count and teaching groups." : "اختر الخطة حسب عدد طلابك ومجموعاتك التعليمية.")
    : (en ? "Choose a plan based on your students, teachers and academy groups." : "اختر الخطة حسب عدد الطلاب والمدرسين والمجموعات في أكاديميتك.");

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={title} description={description} />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            {en ? "Current plan: " : "الخطة الحالية: "}<Badge variant="secondary">{en ? currentPlan.nameEn : currentPlan.name}</Badge>
            <Badge variant={sub.status === "active" || sub.status === "trialing" ? "success" : "destructive"}>
              {sub.status === "active" ? (en ? "Active" : "نشطة") : sub.status === "trialing" ? (en ? "Trial" : "تجريبية") : sub.status === "past_due" ? (en ? "Payment due" : "دفعة مستحقة") : sub.status === "canceled" ? (en ? "Canceled" : "ملغاة") : (en ? "Expired" : "منتهية")}
            </Badge>
            <Badge variant="outline">{isTeacherWorkspace ? (en ? "Independent teacher" : "مدرس مستقل") : (en ? "Academy" : "أكاديمية")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {usageItems.map((u) => (
            <div key={u.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{u.label}</span>
                <span className={u.current >= u.limit ? "font-semibold text-rose-600" : "font-medium"}>
                  {u.current} / {u.limit === 99999 ? "∞" : u.limit}
                </span>
              </div>
              <Progress value={u.limit === 99999 ? 10 : (u.current / u.limit) * 100} indicatorClassName={u.current >= u.limit ? "bg-rose-500" : "bg-primary"} />
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{en ? "Storage" : "التخزين"}</span>
              <span className={storageUsedMb !== null && storageUsedMb >= currentPlan.maxStorageMb ? "font-semibold text-rose-600" : "font-medium"}>
                {storageUsedMb === null ? (en ? "Unavailable" : "غير متاح") : `${storageUsedMb.toFixed(1)} / ${currentPlan.maxStorageMb} ${en ? "MB" : "ميجابايت"}`}
              </span>
            </div>
            <Progress value={storageUsedMb === null ? 0 : Math.min(100, (storageUsedMb / currentPlan.maxStorageMb) * 100)} indicatorClassName={storageUsedMb !== null && storageUsedMb / currentPlan.maxStorageMb >= 0.8 ? "bg-amber-500" : "bg-primary"} />
          </div>
          <div className="grid gap-2 border-t pt-3 text-sm text-muted-foreground sm:grid-cols-2">
            <span>{en ? "Next renewal: " : "التجديد القادم: "}{renewalDate && !Number.isNaN(renewalDate.getTime()) ? renewalDate.toLocaleDateString(en ? "en-GB" : "ar-EG", { dateStyle: "long" }) : (en ? "Not set" : "غير محدد")}</span>
            {sub.cancelAtPeriodEnd && <span className="font-medium text-amber-700">{en ? "It will be canceled at the end of the current period." : "سيتم الإلغاء في نهاية الفترة الحالية."}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan.id;
          const displayName = en ? p.nameEn : p.name;
          return (
            <Card key={p.id} className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{displayName}</h3>
                  {isCurrent && <Badge>{en ? "Current plan" : "الخطة الحالية"}</Badge>}
                  {(p.id === "pro" || p.id === "teacher_pro") && <Sparkles className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="mt-2 text-2xl font-bold">{p.price === 0 ? (en ? "Free" : "مجاني") : formatCurrency(p.price)}{p.price > 0 && <span className="text-sm font-normal text-muted-foreground"> {en ? "/ month" : "/ شهريًا"}</span>}</p>
                <p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">{en ? p.descriptionEn : p.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? `Up to ${p.maxStudents.toLocaleString("en-GB")} students` : `حتى ${p.maxStudents.toLocaleString("ar-EG")} طالب`}</li>
                  {!isTeacherWorkspace && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? `Up to ${p.maxTeachers.toLocaleString("en-GB")} teachers` : `حتى ${p.maxTeachers.toLocaleString("ar-EG")} مدرس`}</li>}
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? `Up to ${p.maxGroups.toLocaleString("en-GB")} groups` : `حتى ${p.maxGroups.toLocaleString("ar-EG")} مجموعة`}</li>
                  {!isTeacherWorkspace && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? `Up to ${p.maxAcademies.toLocaleString("en-GB")} academies` : `حتى ${p.maxAcademies.toLocaleString("ar-EG")} أكاديمية`}</li>}
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{en ? `Storage up to ${formatStorage(p.maxStorageMb)}` : `تخزين حتى ${formatStorage(p.maxStorageMb)}`}</li>
                </ul>
                <PlanCheckoutButton planId={p.id} isCurrent={isCurrent} isFree={p.price === 0} lang={lang} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
