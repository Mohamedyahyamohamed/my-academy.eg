import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/services";
import { listPlans, getPlan, getUsage, getSubscriptionStatus } from "@/services/saas";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  requireRole("ADMIN");
  const plans = listPlans();
  const currentPlan = getPlan();
  const usage = getUsage();
  const sub = getSubscriptionStatus();

  const usageItems = [
    { label: "الطلاب", current: usage.students, limit: currentPlan.maxStudents },
    { label: "Teachers", current: usage.teachers, limit: currentPlan.maxTeachers },
    { label: "المجموعات", current: usage.groups, limit: currentPlan.maxGroups },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plans" description="Manage your subscription and usage limits." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Current Plan: <Badge variant="secondary">{currentPlan.name}</Badge>
            <Badge variant={sub.status === "active" || sub.status === "trialing" ? "success" : "destructive"}>
              {sub.status}
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
                  {isCurrent && <Badge>Current</Badge>}
                  {p.id === "pro" && <Sparkles className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {p.price === 0 ? "Free" : formatCurrency(p.price)}
                  {p.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxStudents === 99999 ? "Unlimited" : p.maxStudents} students
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxTeachers === 999 ? "Unlimited" : p.maxTeachers} teachers
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {p.maxGroups === 999 ? "Unlimited" : p.maxGroups} groups
                  </li>
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
