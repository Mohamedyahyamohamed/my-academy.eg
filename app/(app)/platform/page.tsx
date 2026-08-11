import { Building2, Users, GraduationCap, Crown, Wallet, TrendingUp, Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { PLANS } from "@/services/saas";

export const dynamic = "force-dynamic";

const EGP = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n || 0) + " ج.م";

export default async function PlatformPage() {
  requireRole("SUPER_ADMIN");
  const client = nodeSupabaseClient();

  const [
    { data: academies },
    { data: students },
    { data: teachers },
    { data: subs },
    { data: profiles },
    { data: payments },
  ] = await Promise.all([
    client.from("academies").select("*").order("created_at", { ascending: false }),
    client.from("students").select("academy_id"),
    client.from("teachers").select("academy_id"),
    client.from("subscriptions").select("academy_id,plan_id,status"),
    client.from("profiles").select("academy_id,role"),
    client.from("payments").select("academy_id,amount_paid"),
  ]);

  const count = (rows: any[] | null, aid: string) =>
    (rows ?? []).filter((r) => r.academy_id === aid).length;

  const sumPaid = (aid?: string) =>
    (payments ?? [])
      .filter((p: any) => !aid || p.academy_id === aid)
      .reduce((s: number, p: any) => s + Number(p.amount_paid || 0), 0);

  const subFor = (aid: string) => (subs ?? []).find((s: any) => s.academy_id === aid);
  const priceFor = (aid: string) => {
    const sub = subFor(aid);
    const plan = sub?.plan_id ? PLANS[sub.plan_id] : PLANS.free;
    return { plan, price: plan?.price ?? 0, status: sub?.status ?? "active" };
  };

  const mrr = (subs ?? [])
    .filter((s: any) => s.status === "active" || s.status === "trialing" || !s.status)
    .reduce((sum: number, s: any) => sum + (PLANS[s.plan_id]?.price ?? 0), 0);

  const totalCollected = sumPaid();
  const payingAcademies = (academies ?? []).filter((a: any) => priceFor(a.id).price > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة تحكم المنصة 👑"
        description="إنت صاحب الـ SaaS — بتشوف كل الأكاديميات والإيرادات من هنا."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-emerald-700"><Banknote className="h-4 w-4" /><span className="text-xs font-medium">إيراد الـ SaaS الشهري (MRR)</span></div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{EGP(mrr)}</p>
            <p className="mt-1 text-xs text-muted-foreground">من {payingAcademies} أكاديمية مدفوعة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /><span className="text-xs font-medium">مدفوعات الطلاب (كل المنصة)</span></div>
            <p className="mt-2 text-2xl font-bold">{EGP(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium">إيراد سنوي متوقّع</span></div>
            <p className="mt-2 text-2xl font-bold">{EGP(mrr * 12)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /><span className="text-xs font-medium">أكاديميات</span></div>
            <p className="mt-2 text-2xl font-bold">{academies?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><Users className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{students?.length ?? 0}</p><p className="text-xs text-muted-foreground">طالب</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><GraduationCap className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{teachers?.length ?? 0}</p><p className="text-xs text-muted-foreground">مدرّس</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><Crown className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{profiles?.length ?? 0}</p><p className="text-xs text-muted-foreground">مستخدم</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">كل الأكاديميات والإيرادات</h2>
            <span className="text-xs text-muted-foreground">إيراد الـ SaaS من كل أكاديمية</span>
          </div>
          <div className="divide-y">
            {(academies ?? []).map((a: any) => {
              const { plan, price, status } = priceFor(a.id);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar><AvatarFallback>{(a.name || "A").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {count(students, a.id)} طالب · {count(teachers, a.id)} مدرّس · {new Date(a.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">{EGP(price)}<span className="text-xs font-normal text-muted-foreground">/شهر</span></p>
                      <p className="text-xs text-muted-foreground">تحصيل: {EGP(sumPaid(a.id))}</p>
                    </div>
                    <Badge variant="secondary">{plan?.name ?? "free"}</Badge>
                    <Badge variant={status === "active" ? "success" : "secondary"}>{status}</Badge>
                  </div>
                </div>
              );
            })}
            {(!academies || academies.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">مفيش أكاديميات بعد.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        💡 إيراد الـ SaaS بييجي من اشتراكات الأكاديميات. لما تتوصّل الدفع (Paymob)، الأكاديميات هتدفع وMRR هيطلع هنا أوتوماتيك.
      </p>
    </div>
  );
}