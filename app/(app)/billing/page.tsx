import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/services";
import { listPlans, getPlan, getUsage, getSubscriptionStatus } from "@/services/saas";
import { formatCurrency } from "@/lib/utils";
import { PlanCheckoutButton } from "@/components/billing/plan-checkout-button";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  requireRole("ADMIN");
  const plans = listPlans();
  const currentPlan = getPlan();
  const usage = getUsage();
  const sub = getSubscriptionStatus();

  const usageItems = [
    { label: "الطلاب", current: usage.students, limit: currentPlan.maxStudents },
    { label: "المدرسون", current: usage.teachers, limit: currentPlan.maxTeachers },
    { label: "المجموعات", current: usage.groups, limit: currentPlan.maxGroups },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="الاشتراكات والخطط" description="إدارة اشتراكك وحدود الاستخدام." />

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
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxStudents === 99999 ? "عدد غير محدود" : p.maxStudents} طالب
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxTeachers === 999 ? "عدد غير محدود" : p.maxTeachers} مدرس
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxGroups === 999 ? "عدد غير محدود" : p.maxGroups} مجموعة
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
