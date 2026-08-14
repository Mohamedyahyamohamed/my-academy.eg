import { Building2, Users, GraduationCap, Wallet, Bell, Shield, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/shared/badges";
import { AcademySettingsForm, CoursesManager } from "@/components/settings/settings-forms";
import { AcademyBranding } from "@/components/settings/academy-branding";
import { InviteManager } from "@/components/settings/invite-manager";
import { listAcademyInvites } from "@/app/actions/invites";
import { ChangePasswordForm } from "@/components/settings/change-password";
import { MiscService, requireScopedRole } from "@/services";
import { initials } from "@/lib/utils";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = ["academy", "users", "courses", "payments", "security", "roles"].includes(requestedTab ?? "")
    ? requestedTab!
    : "academy";
  // صفحات App Router قد تُرسم بالتوازي مع التخطيط؛ نُحمّل لقطة المستأجر
  // صراحةً قبل أي قراءة متزامنة من المخزن حتى لا تفشل جلسة صحيحة مؤقتًا.
  const user = await requireScopedRole("ADMIN");
  const academy = MiscService.getAcademy(user.academy_id);
  const courses = await MiscService.listCourses(user.academy_id);
  const users = MiscService.listProfiles(user.academy_id);
  const invites = await listAcademyInvites();

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" description="إدارة أكاديميتك: المستخدمين والمواد والإعدادات." />

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="academy"><Building2 className="h-4 w-4" /> الأكاديمية</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4" /> المستخدمون</TabsTrigger>
          <TabsTrigger value="courses"><GraduationCap className="h-4 w-4" /> المواد</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="h-4 w-4" /> الدفع</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4" /> الأمان</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4" /> الأدوار</TabsTrigger>
        </TabsList>

        <TabsContent value="academy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات الأكاديمية</CardTitle>
              <CardDescription>تظهر هذه البيانات في جميع أجزاء المنصة والتقارير.</CardDescription>
            </CardHeader>
            <CardContent>
              <AcademySettingsForm academy={academy} />
            </CardContent>
          </Card>

          <AcademyBranding academy={academy} />

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">الانضمام الآمن للأكاديمية</CardTitle>
              <CardDescription>
                للحفاظ على خصوصية بيانات الأكاديمية، أرسل دعوة شخصية من تبويب المستخدمين بدل مشاركة كود عام للتسجيل.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">كل دعوة مرتبطة بالبريد الإلكتروني، محدودة المدة، وتُستخدم مرة واحدة فقط.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">المستخدمون والصلاحيات</CardTitle>
                <CardDescription>الأشخاص الذين لديهم حسابات في أكاديميتك.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <Avatar><AvatarFallback>{initials(u.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                    <Badge variant={u.is_active ? "success" : "secondary"}>{u.is_active ? "نشط" : "غير نشط"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div id="invite" className="mt-4 scroll-mt-6">
            <InviteManager initialInvites={invites} />
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">المواد الدراسية</CardTitle>
              <CardDescription>المواد التي تقدمها أكاديميتك.</CardDescription>
            </CardHeader>
            <CardContent>
              <CoursesManager courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">طرق الدفع</CardTitle>
              <CardDescription>طرق الدفع المقبولة.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => <Badge key={m} variant="secondary">{paymentMethodLabel(m)}</Badge>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <ChangePasswordForm />
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الأدوار والصلاحيات</CardTitle>
              <CardDescription>كيفية عمل صلاحيات الوصول بحسب الدور في {academy.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { role: "ADMIN", desc: "صلاحية كاملة لكل أقسام وبيانات الأكاديمية." },
                { role: "TEACHER", desc: "إدارة المجموعات والحصص والحضور والدرجات والواجبات المسندة إليه." },
                { role: "PARENT", desc: "عرض بيانات أبنائهم فقط." },
                { role: "STUDENT", desc: "عرض سجلاتهم الخاصة فقط، دون تعديل الدرجات أو الحضور." },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RoleBadge role={r.role as any} />
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                Authorization is enforced on the server for every action. UI hiding is never the only protection.
                في بيئة الإنتاج، تحمي سياسات أمان الصفوف في PostgreSQL (راجِع <code>supabase/schema.sql</code>) كل جدول.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
