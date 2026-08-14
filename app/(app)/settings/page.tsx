import { cookies } from "next/headers";
import { Building2, GraduationCap, Lock, Shield, Users, Wallet } from "lucide-react";
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
import { getLangFromCookie, isRTL, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lang: Lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const ar = lang === "ar";
  const text = {
    title: ar ? "الإعدادات" : "Settings",
    description: ar ? "إدارة أكاديميتك: المستخدمين والمواد والإعدادات." : "Manage your academy, users, courses, and preferences.",
    academy: ar ? "الأكاديمية" : "Academy",
    users: ar ? "المستخدمون" : "Users",
    courses: ar ? "المواد" : "Courses",
    payments: ar ? "الدفع" : "Payments",
    security: ar ? "الأمان" : "Security",
    roles: ar ? "الأدوار" : "Roles",
    academyData: ar ? "بيانات الأكاديمية" : "Academy information",
    academyDataDescription: ar ? "تظهر هذه البيانات في جميع أجزاء المنصة والتقارير." : "This information appears across the platform and reports.",
    safeJoin: ar ? "الانضمام الآمن للأكاديمية" : "Secure academy joining",
    safeJoinDescription: ar ? "للحفاظ على خصوصية بيانات الأكاديمية، أرسل دعوة شخصية من تبويب المستخدمين بدل مشاركة كود عام للتسجيل." : "To protect academy data, send a personal invitation from the Users tab instead of sharing a public registration code.",
    inviteRule: ar ? "كل دعوة مرتبطة بالبريد الإلكتروني، محدودة المدة، وتُستخدم مرة واحدة فقط." : "Each invitation is tied to an email, expires automatically, and can be used only once.",
    usersTitle: ar ? "المستخدمون والصلاحيات" : "Users and permissions",
    usersDescription: ar ? "الأشخاص الذين لديهم حسابات في أكاديميتك." : "People with accounts in your academy.",
    active: ar ? "نشط" : "Active",
    inactive: ar ? "غير نشط" : "Inactive",
    coursesTitle: ar ? "المواد الدراسية" : "Courses",
    coursesDescription: ar ? "المواد التي تقدمها أكاديميتك." : "Courses offered by your academy.",
    paymentTitle: ar ? "طرق الدفع" : "Payment methods",
    paymentDescription: ar ? "طرق الدفع المقبولة." : "Accepted payment methods.",
    rolesTitle: ar ? "الأدوار والصلاحيات" : "Roles and permissions",
    rolesDescription: ar ? "كيفية عمل صلاحيات الوصول بحسب الدور في " : "How access permissions work by role in ",
    fullAccess: ar ? "صلاحية كاملة لكل أقسام وبيانات الأكاديمية." : "Full access to all academy sections and data.",
    teacherAccess: ar ? "إدارة المجموعات والحصص والحضور والدرجات والواجبات المسندة إليه." : "Manage assigned groups, lessons, attendance, grades, and homework.",
    parentAccess: ar ? "عرض بيانات أبنائهم فقط." : "View their children's data only.",
    studentAccess: ar ? "عرض سجلاتهم الخاصة فقط، دون تعديل الدرجات أو الحضور." : "View their own records without editing grades or attendance.",
    serverAuth: ar ? "يتم فرض التفويض على الخادم لكل عملية. إخفاء عناصر الواجهة ليس الحماية الوحيدة." : "Authorization is enforced on the server for every action. Hiding UI elements is never the only protection.",
    dbAuth: ar ? "في بيئة الإنتاج، تحمي سياسات أمان الصفوف في PostgreSQL كل جدول." : "In production, PostgreSQL row-level security policies protect every table.",
  };
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = ["academy", "users", "courses", "payments", "security", "roles"].includes(requestedTab ?? "")
    ? requestedTab!
    : "academy";
  const user = await requireScopedRole("ADMIN");
  const academy = await MiscService.getAcademyAsync(user.academy_id);
  const courses = await MiscService.listCourses(user.academy_id);
  const users = MiscService.listProfiles(user.academy_id);
  const invites = await listAcademyInvites(user.academy_id);

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader title={text.title} description={text.description} />

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="academy"><Building2 className="h-4 w-4" /> {text.academy}</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4" /> {text.users}</TabsTrigger>
          <TabsTrigger value="courses"><GraduationCap className="h-4 w-4" /> {text.courses}</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="h-4 w-4" /> {text.payments}</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4" /> {text.security}</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4" /> {text.roles}</TabsTrigger>
        </TabsList>

        <TabsContent value="academy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{text.academyData}</CardTitle>
              <CardDescription>{text.academyDataDescription}</CardDescription>
            </CardHeader>
            <CardContent><AcademySettingsForm academy={academy} /></CardContent>
          </Card>
          <AcademyBranding academy={academy} />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">{text.safeJoin}</CardTitle>
              <CardDescription>{text.safeJoinDescription}</CardDescription>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{text.inviteRule}</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div><CardTitle className="text-base">{text.usersTitle}</CardTitle><CardDescription>{text.usersDescription}</CardDescription></div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <Avatar><AvatarFallback>{initials(u.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{u.full_name}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
                    <RoleBadge role={u.role} />
                    <Badge variant={u.is_active ? "success" : "secondary"}>{u.is_active ? text.active : text.inactive}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div id="invite" className="mt-4 scroll-mt-6"><InviteManager initialInvites={invites} /></div>
        </TabsContent>

        <TabsContent value="courses"><Card><CardHeader><CardTitle className="text-base">{text.coursesTitle}</CardTitle><CardDescription>{text.coursesDescription}</CardDescription></CardHeader><CardContent><CoursesManager courses={courses} /></CardContent></Card></TabsContent>
        <TabsContent value="payments"><Card><CardHeader><CardTitle className="text-base">{text.paymentTitle}</CardTitle><CardDescription>{text.paymentDescription}</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{PAYMENT_METHODS.map((m) => <Badge key={m} variant="secondary">{paymentMethodLabel(m)}</Badge>)}</div></CardContent></Card></TabsContent>
        <TabsContent value="security"><ChangePasswordForm /></TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle className="text-base">{text.rolesTitle}</CardTitle><CardDescription>{text.rolesDescription}{academy.name}.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {[
                { role: "ADMIN", desc: text.fullAccess },
                { role: "TEACHER", desc: text.teacherAccess },
                { role: "PARENT", desc: text.parentAccess },
                { role: "STUDENT", desc: text.studentAccess },
              ].map((r) => <div key={r.role} className="flex items-start gap-3 rounded-lg border border-border p-3"><RoleBadge role={r.role as any} /><p className="text-sm text-muted-foreground">{r.desc}</p></div>)}
              <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground"><Shield className="h-4 w-4 shrink-0 text-primary" />{text.serverAuth} {text.dbAuth}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
