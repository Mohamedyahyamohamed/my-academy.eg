import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { resolveStudent, studentLessons, requireRole } from "@/services";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentLessonsPage() {
  const user = requireRole("STUDENT");
  const student = resolveStudent(user);
  const lessons = student ? await studentLessons(student.id) : [];
  const upcoming = lessons.filter((l) => +new Date(l.date) >= Date.now());
  const past = lessons.filter((l) => +new Date(l.date) < Date.now());

  return (
    <div className="space-y-6">
      <PageHeader title="Lessons" description="Your lesson schedule and history." />
      {lessons.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No lessons" description="No lessons scheduled for your groups." />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><Badge variant="info">Upcoming ({upcoming.length})</Badge></div>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Topic</TableHead><TableHead>Group</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcoming.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
                      <TableCell className="font-medium">{l.topic}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.group?.name}</TableCell>
                      <TableCell className="text-sm">{formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)}</TableCell>
                    </TableRow>
                  ))}
                  {upcoming.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No upcoming lessons.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3"><Badge variant="secondary">Past ({past.length})</Badge></div>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Topic</TableHead><TableHead>Group</TableHead></TableRow></TableHeader>
                <TableBody>
                  {past.slice(0, 10).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
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
