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

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const currentUser = await requireScopedRole("ADMIN");
  const plans = listPlans();
  const currentPlan = getPlan(currentUser.academy_id);
  const usage = getUsage(currentUser.academy_id);
  const sub = getSubscriptionStatus(currentUser.academy_id);
  const storageResult = nodeSupabaseClient()
    ? await measureStorageUsage(nodeSupabaseClient()!, "homework", currentUser.academy_id)
    : { ok: false as const, error: "Storage is not configured." };
  const storageUsedMb = storageResult.ok ? storageResult.bytes / (1024 * 1024) : null;
  const renewalDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  const usageItems = [
    { label: "الطلاب", current: usage.students, limit: currentPlan.maxStudents },
    { label: "المدرسون", current: usage.teachers, limit: currentPlan.maxTeachers },
    { label: "المجموعات", current: usage.groups, limit: currentPlan.maxGroups },
  ];

  const formatStorage = (mb: number) => mb >= 1024 ? `${mb / 1024} جيجابايت` : `${mb} ميجابايت`;

  return (
    <div className="space-y-6">
      <PageHeader title="الاشتراكات والخطط" description="أسعار بسيطة بالـ EGP وحدود واضحة تنمو مع أكاديميتك." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            الخطة الحالية: <Badge variant="secondary">{currentPlan.name}</Badge>
            <Badge variant={sub.status === "active" || sub.status === "trialing" ? "success" : "destructive"}>
              {sub.status === "active" ? "نشطة" : sub.status === "trialing" ? "تجريبية" : sub.status === "past_due" ? "دفعة مستحقة" : sub.status === "canceled" ? "ملغاة" : "منتهية"}
            </Badge>
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
              <Progress
                value={u.limit === 99999 ? 10 : (u.current / u.limit) * 100}
                indicatorClassName={u.current >= u.limit ? "bg-rose-500" : "bg-primary"}
              />
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">التخزين</span>
              <span className={storageUsedMb !== null && storageUsedMb >= currentPlan.maxStorageMb ? "font-semibold text-rose-600" : "font-medium"}>
                {storageUsedMb === null ? "غير متاح" : `${storageUsedMb.toFixed(1)} / ${currentPlan.maxStorageMb} ميجابايت`}
              </span>
            </div>
            <Progress
              value={storageUsedMb === null ? 0 : Math.min(100, (storageUsedMb / currentPlan.maxStorageMb) * 100)}
              indicatorClassName={storageUsedMb !== null && storageUsedMb / currentPlan.maxStorageMb >= 0.8 ? "bg-amber-500" : "bg-primary"}
            />
          </div>
          <div className="grid gap-2 border-t pt-3 text-sm text-muted-foreground sm:grid-cols-2">
            <span>
              التجديد القادم: {renewalDate && !Number.isNaN(renewalDate.getTime()) ? renewalDate.toLocaleDateString("ar-EG", { dateStyle: "long" }) : "غير محدد"}
            </span>
            {sub.cancelAtPeriodEnd && <span className="font-medium text-amber-700">سيتم الإلغاء في نهاية الفترة الحالية.</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan.id;
          return (
            <Card key={p.id} className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  {isCurrent && <Badge>الخطة الحالية</Badge>}
                  {p.id === "pro" && <Sparkles className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {p.price === 0 ? "مجاني" : formatCurrency(p.price)}
                  {p.price > 0 && <span className="text-sm font-normal text-muted-foreground"> / شهريًا</span>}
                </p>
                <p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">{p.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    حتى {p.maxStudents.toLocaleString("ar-EG")} طالب
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    حتى {p.maxTeachers.toLocaleString("ar-EG")} مدرس
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    حتى {p.maxGroups.toLocaleString("ar-EG")} مجموعة
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    حتى {p.maxAcademies.toLocaleString("ar-EG")} أكاديمية
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    تخزين حتى {formatStorage(p.maxStorageMb)}
                  </li>
                </ul>
                <PlanCheckoutButton planId={p.id} isCurrent={isCurrent} isFree={p.price === 0} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
