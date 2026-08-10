import { Building2, Users, GraduationCap, Wallet, Bell, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/shared/badges";
import { AcademySettingsForm, CoursesManager } from "@/components/settings/settings-forms";
import { CreateUserDialog } from "@/components/settings/create-user-dialog";
import { MiscService, requireRole } from "@/services";
import { initials } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  requireRole("ADMIN");
  const academy = MiscService.getAcademy();
  const courses = await MiscService.listCourses();
  const users = MiscService.listProfiles();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your academy, users, courses and configuration." />

      <Tabs defaultValue="academy">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="academy"><Building2 className="h-4 w-4" /> Academy</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="courses"><GraduationCap className="h-4 w-4" /> Courses</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="h-4 w-4" /> Payments</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4" /> Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="academy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academy information</CardTitle>
              <CardDescription>This appears across the product and on reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <AcademySettingsForm academy={academy} />
            </CardContent>
          </Card>
                    <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">كود انضمام الطلاب وأولياء الأمور</CardTitle>
              <CardDescription>شارك الكود ده عشان يسجّلوا لوحدهم وينضمّوا لأكاديميتك.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-border bg-muted px-4 py-2 text-lg font-semibold tracking-wide">
                  {academy.slug ?? "—"}
                </code>
                <p className="text-xs text-muted-foreground">الطالب/ولي الأمر بيدخل الكود ده في صفحة /signup.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Users & access</CardTitle>
                <CardDescription>People with accounts in your academy.</CardDescription>
              </div>
              <CreateUserDialog />
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
                    <Badge variant={u.is_active ? "success" : "secondary"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Courses</CardTitle>
              <CardDescription>Subjects offered by your academy.</CardDescription>
            </CardHeader>
            <CardContent>
              <CoursesManager courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment methods</CardTitle>
              <CardDescription>Accepted payment methods.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roles & permissions</CardTitle>
              <CardDescription>How role-based access control works in {academy.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { role: "ADMIN", desc: "Full access to everything in the academy." },
                { role: "TEACHER", desc: "Manage assigned groups, lessons, attendance, grades and homework." },
                { role: "PARENT", desc: "View only their own children's data." },
                { role: "STUDENT", desc: "View only their own records; cannot modify grades or attendance." },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RoleBadge role={r.role as any} />
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                Authorization is enforced on the server for every action. UI hiding is never the only protection.
                In production, Row Level Security on PostgreSQL (see <code>supabase/schema.sql</code>) guards every table.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
