import Link from "next/link";
import { UsersRound, Calendar, ArrowLeft, FolderOpen, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AddGroupDialog } from "@/components/groups/group-dialogs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GroupsService, MiscService, requireScopedRole, getCurrentUser, currentTeacherId } from "@/services";
import { formatCurrency, formatSchedule } from "@/lib/utils";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const isTeacher = user.role === "TEACHER";
  const cachedTid = isTeacher ? currentTeacherId() : null;
  const resolvedTeacher = isTeacher ? await GroupsService.resolveTeacherForGroups(user.academy_id, user.id, user.email) : null;
  const tid = cachedTid ?? resolvedTeacher?.id ?? null;
  const groups = await GroupsService.listGroups("", user.academy_id, isTeacher ? user.id : undefined, isTeacher ? user.email : undefined);
  const courses = await MiscService.listCourses(user.academy_id);
  const teachers = await MiscService.listTeachers(user.academy_id);
  const groupCreationBlocked = isTeacher ? !tid : teachers.length === 0;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-l from-indigo-950 via-blue-950 to-slate-950 p-6 shadow-[0_16px_50px_-20px_rgb(99_102_241/0.45)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,indigo_500/0.18),transparent_42%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
              <UsersRound className={`h-5 w-5 text-indigo-300`} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{ en ? "Groups" : "المجموعات" }</h1>
              <p className="mt-0.5 text-sm text-slate-400">{ en ? "Organize students by subject, teacher, and schedule." : "نظّم الطلاب في مجموعات حسب المادة والمدرّس والجدول." }</p>
            </div>
          </div>

        </div>
      </div>

      {groupCreationBlocked && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-medium">{en ? "Create a teacher or link your account first" : "أنشئ مدرسًا أو اربط حسابك أولًا"}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {en ? "Each group needs an assigned teacher. Invite a teacher from Settings, then return here to create the group. You can enter a new subject in the group form without setting it up first." : "كل مجموعة تحتاج مدرسًا مسؤولًا عنها. أرسل دعوة للمدرس من الإعدادات، ثم ارجع إلى هنا لإنشاء المجموعة. يمكنك كتابة مادة جديدة داخل نموذج المجموعة دون إعدادها مسبقًا."}
                </p>
              </div>
            </div>
            {!isTeacher && (
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/settings?tab=users#invite">{en ? "Invite teacher" : "دعوة مدرس"}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState
              icon={FolderOpen}
              title={en ? "No groups yet" : "لا توجد مجموعات بعد"}
          description={en ? "Create your first group to start scheduling lessons and tracking attendance." : "أنشئ أول مجموعة لبدء جدولة الحصص ومتابعة الحضور."}
          action={
            <AddGroupDialog
              courses={courses}
              teachers={teachers}
              defaultTeacherId={tid}
              lockedTeacher={isTeacher}
                disabled={groupCreationBlocked}
                label={en ? "Create your first group" : "إنشاء أول مجموعة"}
              />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="group h-full border-border transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl dark:hover:border-indigo-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                        style={{ background: g.course?.color ?? "#7c5cfc" }}
                      >
                        {g.course?.name?.[0] ?? "G"}
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{g.name}</p>
                        <p className="mt-1 inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">{g.course?.name ?? (en ? "General" : "عام")}</p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <UsersRound className="h-4 w-4" /> {g.student_count} {en ? "students" : "طالب"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" /> {formatSchedule(g.schedule, en ? "en-EG" : "ar-EG")}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-sm">
                      {en ? "Teacher: " : "المدرّس: "}
                      <span className="font-medium text-foreground">
                        {g.teacher ? `${g.teacher.first_name} ${g.teacher.last_name}` : "—"}
                      </span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{formatCurrency(g.monthly_fee)}/{en ? "month" : "شهر"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
