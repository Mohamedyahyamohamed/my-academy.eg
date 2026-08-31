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
import { cn, formatClockTime, fullName, percentage } from "@/lib/utils";
import { isLessonActive } from "@/lib/lesson-time";
import type { AttendanceStatus, Group, Lesson, Student } from "@/types";
import { saveAttendanceAction } from "@/app/actions/attendance";
import { QrCheckin } from "@/components/attendance/qr-checkin";
import { useClientLang } from "@/lib/i18n-client";

type Status = AttendanceStatus | null;

interface AttendanceWorkshopProps {
  groups: Group[];
  lessons: Lesson[];
  students: Student[];
  enrollments: { groupId: string; studentId: string }[];
}

const STATUS_OPTS: { value: AttendanceStatus; ar: string; en: string; icon: any; active: string; idle: string }[] = [
  { value: "PRESENT", ar: "حاضر", en: "Present", icon: Check, active: "bg-emerald-500 text-white border-emerald-500", idle: "text-emerald-600 hover:bg-emerald-50" },
  { value: "LATE", ar: "متأخر", en: "Late", icon: Clock, active: "bg-amber-500 text-white border-amber-500", idle: "text-amber-600 hover:bg-amber-50" },
  { value: "ABSENT", ar: "غائب", en: "Absent", icon: X, active: "bg-rose-500 text-white border-rose-500", idle: "text-rose-600 hover:bg-rose-50" },
];

export function AttendanceWorkshop({
  groups, lessons, students, enrollments,
}: AttendanceWorkshopProps) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const params = useSearchParams();
  const groupId = params.get("group") ?? "";
  const lessonId = params.get("lesson") ?? "";

  const groupLessons = lessons
    .filter((l) => l.group_id === groupId)
    .sort((a, b) => {
      const da = `${a.date} ${a.start_time ?? ""}`;
      const db = `${b.date} ${b.start_time ?? ""}`;
      return +new Date(db) - +new Date(da);
    });

  // Auto-select the best lesson when a group is picked and no lesson chosen yet:
  // today's lesson first, then the nearest upcoming one, else the most recent past.
  const groupLessonsRef = React.useRef(groupLessons);
  React.useEffect(() => {
    // Keep the latest list reachable from effects without writing during render.
    groupLessonsRef.current = groupLessons;
  }, [groupLessons]);
  const groupKey = groupLessons.map((l) => l.id).join(",");
  React.useEffect(() => {
    if (!groupId || lessonId || !groupKey) return;
    const list = groupLessonsRef.current;
    const todayKey = new Date().toLocaleDateString("en-CA");
    const target =
      list.find((l) => isLessonActive(l)) ??
      list.find((l) => String(l.date).slice(0, 10) === todayKey) ??
      [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date)).find((l) => +new Date(`${l.date}T${l.start_time ?? "23:59"}`) >= Date.now()) ??
      list[0];
    const next = new URLSearchParams(params.toString());
    next.set("lesson", target.id);
    router.replace(`/attendance?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, lessonId, groupKey]);

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
    fetch(`/api/attendance?lesson=${encodeURIComponent(lessonId)}&_=${Date.now()}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Attendance status request failed");
        return r.json();
      })
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
      toast.error(en ? "Set an attendance status for every student before saving." : "حدّد حالة الحضور لكل طالب قبل الحفظ.");
      return;
    }
    setSaving(true);
    try {
      if (!groupId || !lessonId) {
        throw new Error(en ? "Choose a group and lesson first." : "اختر المجموعة والحصة أولًا.");
      }
      const result = await saveAttendanceAction(groupId, lessonId, entries);
      if (!result.ok) {
        throw new Error(result.error);
      }
      toast.success(en ? `Attendance saved for ${result.saved} students.` : `تم حفظ حضور ${result.saved} طالب.`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      console.error("attendance save failed:", error);
      toast.error(en ? `Could not save attendance${message ? `: ${message}` : "."}` : `تعذّر حفظ الحضور${message ? `: ${message}` : "."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      {/* Setup selectors */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{en ? "1. Choose group" : "1. اختر المجموعة"}</label>
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
              <option value="">{en ? "Choose group…" : "اختر مجموعة…"}</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{en ? "2. Choose lesson" : "2. اختر الحصة"}</label>
            <select
              value={lessonId}
              onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                next.set("lesson", e.target.value);
                router.replace(`/attendance?${next.toString()}`);
              }}
              disabled={!groupId}
              dir="ltr"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{en ? "Choose lesson…" : "اختر حصة…"}</option>
              {groupLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {new Date(l.date + "T00:00:00").toLocaleDateString(en ? "en-EG" : "ar-EG", { weekday: "long", day: "numeric", month: "short" })} • {formatClockTime(l.start_time, en ? "en-EG" : "ar-EG")}{l.topic ? ` — ${l.topic}` : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {!groupId || !lessonId ? (
        <EmptyState
          icon={CalendarCheck}
          title={en ? "Choose a group and lesson" : "اختر مجموعة وحصة"}
          description={en ? "Choose a group and lesson to start recording attendance." : "اختر المجموعة ثم الحصة لبدء تسجيل الحضور."}
        />
      ) : roster.length === 0 ? (
        <EmptyState icon={Users} title={en ? "No students in this group" : "لا يوجد طلاب في هذه المجموعة"} description={en ? "Add students first." : "سجّل الطلاب أولًا."} />
      ) : (
        <>
          {/* Summary + bulk actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{en ? "Present" : "حاضر"} {counts.present}</Badge>
              <Badge variant="warning">{en ? "Late" : "متأخر"} {counts.late}</Badge>
              <Badge variant="destructive">{en ? "Absent" : "غائب"} {counts.absent}</Badge>
              <Badge variant="info">{en ? "Rate" : "النسبة"} {counts.rate}%</Badge>
            </div>
            <div className="flex gap-2">
              <QrCheckin lessonId={lessonId} groupId={groupId} />
              <Button variant="outline" size="sm" onClick={() => setAll("PRESENT")}>
                <CheckCheck className="h-4 w-4 text-emerald-600" /> {en ? "Mark all present" : "تسجيل الكل حاضرًا"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAll("ABSENT")}>
                <XCircle className="h-4 w-4 text-rose-600" /> {en ? "Mark all absent" : "تسجيل الكل غائبًا"}
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
                            <Icon className="h-3.5 w-3.5" /> {en ? opt.en : opt.ar}
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
              {en ? "Save attendance" : "حفظ الحضور"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
