import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Users,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  UserMinus,
  CalendarDays,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { StudentStatusBadge } from "@/components/shared/badges";
import { EditGroupDialog } from "@/components/groups/group-dialogs";
import { AddStudentToGroupDialog } from "@/components/groups/add-student-to-group";
import { AssistantsManager } from "@/components/groups/assistants-manager";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GroupsService,
  MiscService,
  StudentsService,
  requireRole,
  getCurrentUser,
  currentTeacherId,
} from "@/services";
import { removeStudentFromGroupAction } from "@/app/actions/groups";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = requireRole("ADMIN", "TEACHER");
  const isTeacher = user.role === "TEACHER";
  const tid = isTeacher ? currentTeacherId() : null;
  const detail = await GroupsService.getGroupDetail(params.id);
  if (!detail) notFound();

  const courses = await MiscService.listCourses();
  const teachers = await MiscService.listTeachers();
  const allStudents = (await StudentsService.listStudents({ pageSize: 500 })).items;
  const enrolledIds = detail.students.map((s) => s.id);
  const availableStudents = allStudents.filter(
    (s) => !enrolledIds.includes(s.id) && s.status !== "ARCHIVED",
  );
  const avgGrade = GroupsService.groupAverageGrade(params.id);

  const stats = [
    { label: "الطلاب", value: detail.students.length, icon: Users },
    { label: "الحصص", value: detail.lessons.length, icon: BookOpen },
    { label: "الحضور", value: `${detail.attendanceRate}%`, icon: CalendarCheck },
    { label: "متوسط الدرجات", value: `${avgGrade}%`, icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.name}
        description={`${detail.course?.name} · ${detail.schedule}`}
        breadcrumbs={[
          { label: "المجموعات", href: "/groups" },
          { label: detail.name },
        ]}
      >
        <Button asChild variant="outline">
          <Link href="/groups"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <EditGroupDialog
          group={detail}
          courses={courses}
          teachers={teachers}
          defaultTeacherId={tid}
          lockedTeacher={isTeacher}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Students */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Enrolled students</CardTitle>
            <AddStudentToGroupDialog groupId={params.id} availableStudents={availableStudents} />
          </CardHeader>
          <CardContent className="p-0">
            {detail.students.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Users}
                  title="No students enrolled"
                  description="Add students to this group to start tracking."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/students/${s.id}`} className="flex items-center gap-3">
                          <StudentAvatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                          <span className="font-medium">{s.first_name} {s.last_name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{s.grade || "—"}</TableCell>
                      <TableCell><StudentStatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Remove">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          }
                          title="Remove student?"
                          description={`Remove ${s.first_name} ${s.last_name} from this group?`}
                          confirmLabel="Remove"
                          destructive
                          onConfirm={removeStudentFromGroupAction.bind(null, params.id, s.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Schedule + info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Course" value={detail.course?.name ?? "—"} />
            <Row label="Teacher" value={detail.teacher ? `${detail.teacher.first_name} ${detail.teacher.last_name}` : "—"} />
            <Row label="Schedule" value={detail.schedule} />
            <Row label="Room" value={detail.room ?? "—"} />
            <Row label='الرسوم الشهرية' value={formatCurrency(detail.monthly_fee)} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="flex-1" variant="soft">
                <Link href={`/attendance?group=${params.id}`}>
                  <CalendarCheck className="h-4 w-4" /> Take attendance
                </Link>
              </Button>
              <Button asChild className="flex-1" variant="outline">
                <Link href={`/lessons/new?group=${params.id}`}>
                  <Plus className="h-4 w-4" /> Create lesson
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assistants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assistants</CardTitle>
            <p className="text-xs text-muted-foreground">Co-teachers who can access this group.</p>
          </CardHeader>
          <CardContent>
            <AssistantsManager
              groupId={params.id}
              ownerId={detail.teacher_id}
              assistants={collections()
                .groupAssistants.filter((ga) => ga.group_id === params.id)
                .map((ga) => {
                  const t = collections().teachers.find((x) => x.id === ga.teacher_id);
                  return { teacherId: ga.teacher_id, name: t ? `${t.first_name} ${t.last_name}` : "—" };
                })}
              teachers={teachers}
            />
          </CardContent>
        </Card>
      </div>

      {/* Lessons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent lessons</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/lessons?group=${params.id}`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {detail.lessons.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={CalendarDays} title="مفيش حصص بعد" description="Create your first lesson for this group." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.lessons.slice(0, 8).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/lessons/${l.id}`} className="hover:text-primary">{l.topic}</Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.start_time} – {l.end_time}</TableCell>
                    <TableCell>
                      <Badge variant={l.attendance_taken ? "success" : "outline"}>
                        {l.attendance_taken ? "Attendance taken" : "معلّق"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
