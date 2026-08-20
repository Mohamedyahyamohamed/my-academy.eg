import { cookies } from "next/headers";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { resolveStudentForDashboard, studentLessons, requireScopedRole } from "@/services";
import { formatDate, formatClockTime } from "@/lib/utils";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentLessonsPage() {
  const user = await requireScopedRole("STUDENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const student = await resolveStudentForDashboard(user);
  const lessons = student ? await studentLessons(student.id, user.academy_id) : [];
  const upcoming = lessons.filter((l) => +new Date(l.date) >= Date.now());
  const past = lessons.filter((l) => +new Date(l.date) < Date.now());

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Lessons" : "الحصص"} description={en ? "Your lesson schedule and history." : "جدول حصصك وسجلها."} />
      {lessons.length === 0 ? (
        <EmptyState icon={CalendarClock} title={en ? "No lessons" : "لا توجد حصص"} description={en ? "No lessons are scheduled for your groups." : "لا توجد حصص مجدولة لمجموعاتك."} />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><Badge variant="info">{en ? "Upcoming lessons" : "الحصص القادمة"} ({upcoming.length})</Badge></div>
              <Table>
                <TableHeader><TableRow><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Topic" : "الموضوع"}</TableHead><TableHead>{en ? "Group" : "المجموعة"}</TableHead><TableHead>{en ? "Time" : "الوقت"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcoming.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell className="font-medium">{l.topic}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                      <TableCell className="text-sm">{formatClockTime(l.start_time, en ? "en-EG" : "ar-EG")}</TableCell>
                    </TableRow>
                  ))}
                  {upcoming.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">{en ? "No upcoming lessons." : "لا توجد حصص قادمة."}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><Badge variant="secondary">{en ? "Past lessons" : "الحصص السابقة"} ({past.length})</Badge></div>
              <Table>
                <TableHeader><TableRow><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Topic" : "الموضوع"}</TableHead><TableHead>{en ? "Group" : "المجموعة"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {past.slice(0, 10).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date, undefined, en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell className="font-medium">{l.topic}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
