"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck, Check, X, Clock, CheckCheck, XCircle, Loader2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, fullName, percentage } from "@/lib/utils";
import type { AttendanceStatus, Group, Lesson, Student } from "@/types";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { QrCheckin } from "@/components/attendance/qr-checkin";

type Status = AttendanceStatus | null;

interface AttendanceWorkshopProps {
  groups: Group[];
  lessons: Lesson[];
  students: Student[];
  enrollments: { groupId: string; studentId: string }[];
}

const STATUS_OPTS: { value: AttendanceStatus; label: string; icon: any; active: string; idle: string }[] = [
  { value: "PRESENT", label: "حاضر", icon: Check, active: "bg-emerald-500 text-white border-emerald-500", idle: "text-emerald-600 hover:bg-emerald-50" },
  { value: "LATE", label: "متأخر", icon: Clock, active: "bg-amber-500 text-white border-amber-500", idle: "text-amber-600 hover:bg-amber-50" },
  { value: "ABSENT", label: "غائب", icon: X, active: "bg-rose-500 text-white border-rose-500", idle: "text-rose-600 hover:bg-rose-50" },
];

export function AttendanceWorkshop({
  groups, lessons, students, enrollments,
}: AttendanceWorkshopProps) {
  const router = useRouter();
  const params = useSearchParams();
  const groupId = params.get("group") ?? "";
  const lessonId = params.get("lesson") ?? "";

  const groupLessons = lessons
    .filter((l) => l.group_id === groupId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const roster = React.useMemo(() => {
    const ids = enrollments.filter((e) => e.groupId === groupId).map((e) => e.studentId);
    return students
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [groupId, students, enrollments]);

  const [statuses, setStatuses] = React.useState<Record<string, Status>>({});
  const [saving, setSaving] = React.useState(false);

  // Load existing attendance when lesson changes
  React.useEffect(() => {
    if (!lessonId) {
      setStatuses({});
      return;
    }
    fetch(`/api/attendance?lesson=${lessonId}`)
      .then((r) => r.json())
      .then((data) => setStatuses(data.statuses ?? {}))
      .catch(() => setStatuses({}));
  }, [lessonId]);

  const counts = React.useMemo(() => {
    const vals = Object.values(statuses).filter(Boolean) as AttendanceStatus[];
    return {
      present: vals.filter((v) => v === "PRESENT").length,
      late: vals.filter((v) => v === "LATE").length,
      absent: vals.filter((v) => v === "ABSENT").length,
      rate: roster.length ? percentage(vals.filter((v) => v !== "ABSENT").length, roster.length) : 0,
    };
  }, [statuses, roster.length]);

  const setAll = (status: AttendanceStatus | null) => {
    const next: Record<string, Status> = {};
    roster.forEach((s) => (next[s.id] = status));
    setStatuses(next);
  };

  const save = async () => {
    const entries = roster
      .map((s) => ({ studentId: s.id, status: statuses[s.id] }))
      .filter((e): e is { studentId: string; status: AttendanceStatus } => Boolean(e.status));
    if (entries.length < roster.length) {
      toast.error("Please mark every student before saving.");
      return;
    }
    setSaving(true);
    try {
      await saveAttendanceAction(groupId, lessonId, entries);
      toast.success(`Attendance saved for ${entries.length} students`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Setup selectors */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">1. Select group</label>
            <select
              value={groupId}
              onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                next.set("group", e.target.value);
                next.delete("lesson");
                router.replace(`/attendance?${next.toString()}`);
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a group…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">2. Select lesson</label>
            <select
              value={lessonId}
              onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                next.set("lesson", e.target.value);
                router.replace(`/attendance?${next.toString()}`);
              }}
              disabled={!groupId}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Choose a lesson…</option>
              {groupLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.topic} — {new Date(l.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {!groupId || !lessonId ? (
        <EmptyState
          icon={CalendarCheck}
          title="Pick a group and lesson"
          description="Select a group, then a lesson to start marking attendance."
        />
      ) : roster.length === 0 ? (
        <EmptyState icon={Users} title="No students in this group" description="Enroll students first." />
      ) : (
        <>
          {/* Summary + bulk actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Present {counts.present}</Badge>
              <Badge variant="warning">Late {counts.late}</Badge>
              <Badge variant="destructive">Absent {counts.absent}</Badge>
              <Badge variant="info">Rate {counts.rate}%</Badge>
            </div>
            <div className="flex gap-2">
              <QrCheckin lessonId={lessonId} />
              <Button variant="outline" size="sm" onClick={() => setAll("PRESENT")}>
                <CheckCheck className="h-4 w-4 text-emerald-600" /> All present
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAll("ABSENT")}>
                <XCircle className="h-4 w-4 text-rose-600" /> All absent
              </Button>
            </div>
          </div>

          {/* Roster */}
          <Card>
            <CardContent className="divide-y p-0">
              {roster.map((s) => {
                const current = statuses[s.id];
                return (
                  <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={fullName(s)} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{fullName(s)}</p>
                        <p className="text-xs text-muted-foreground">{s.grade}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_OPTS.map((opt) => {
                        const active = current === opt.value;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setStatuses((cur) => ({ ...cur, [s.id]: active ? null : opt.value }))
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                              active ? opt.active : cn("border-border", opt.idle),
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" /> {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="sticky bottom-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="shadow-elevated">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save attendance
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
