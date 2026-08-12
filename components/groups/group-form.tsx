"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGroupAction, updateGroupAction } from "@/app/actions/groups";
import { createCourseAction } from "@/app/actions/settings";
import type { Course, Group, Teacher } from "@/types";

const COLORS = ["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6", "#ec4899"];

interface GroupFormProps {
  group?: Group;
  courses: Course[];
  teachers: Teacher[];
  /** Teacher id of the logged-in teacher (so creating a group auto-assigns them). */
  defaultTeacherId?: string | null;
  /** When true, the teacher field is locked to defaultTeacherId (teacher creating their own group). */
  lockedTeacher?: boolean;
  onDone?: () => void;
}

export function GroupForm({
  group,
  courses,
  teachers,
  defaultTeacherId,
  lockedTeacher,
  onDone,
}: GroupFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const existingCourse = group ? courses.find((c) => c.id === group.course_id) : undefined;
  const [courseName, setCourseName] = React.useState(existingCourse?.name ?? "");
  const [courseColor, setCourseColor] = React.useState(existingCourse?.color ?? COLORS[0]);
  const [teacherId, setTeacherId] = React.useState(
    group?.teacher_id ?? defaultTeacherId ?? "",
  );
  const [name, setName] = React.useState(group?.name ?? "");
  const [fee, setFee] = React.useState(String(group?.monthly_fee ?? ""));
  const [schedule, setSchedule] = React.useState(group?.schedule ?? "");
  const [room, setRoom] = React.useState(group?.room ?? "");

  const lockedTeacherName = React.useMemo(() => {
    const t = teachers.find((x) => x.id === defaultTeacherId);
    return t ? `${t.first_name} ${t.last_name}` : "You";
  }, [teachers, defaultTeacherId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Group name is required.");
    if (!courseName.trim()) return toast.error("Course is required.");
    if (!teacherId) return toast.error("Teacher is required.");
    if (!schedule.trim()) return toast.error("Schedule is required.");

    setSaving(true);
    try {
      // Resolve the course: use existing (by name) or create a new one.
      let courseId = courses.find(
        (c) => c.name.toLowerCase() === courseName.trim().toLowerCase(),
      )?.id;
      if (!courseId) {
        const created = await createCourseAction({
          name: courseName.trim(),
          color: courseColor,
        } as any);
        courseId = (created as any)?.id;
        if (!courseId) throw new Error("Could not create course.");
      }

      const payload = {
        name: name.trim(),
        course_id: courseId,
        teacher_id: teacherId,
        monthly_fee: Number(fee) || 0,
        schedule: schedule.trim(),
        room: room.trim() || undefined,
      };
      if (group) {
        await updateGroupAction(group.id, payload);
        toast.success("Group updated");
      } else {
        await createGroupAction(payload);
        toast.success("Group created");
      }
      onDone?.();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label>Group name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 9 — Math A" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Course: free text the first time, autocomplete afterwards */}
        <div className="space-y-1.5">
          <Label>Course *</Label>
          <Input
            list="courses-list"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Type a new course or pick one"
          />
          <datalist id="courses-list">
            {courses.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCourseColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${courseColor === c ? "border-foreground" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            اكتب اسم الكورس أول مرة → هيتحفظ ويبقى موجود في اختياراتك بعد كده.
          </p>
        </div>

        {/* Teacher: auto = you when a teacher creates the group */}
        <div className="space-y-1.5">
          <Label>Teacher *</Label>
          {lockedTeacher ? (
            <Input value={lockedTeacherName} disabled className="bg-muted" />
          ) : (
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Monthly fee</Label>
          <Input type="number" min={0} step="any" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="1200" />
        </div>
        <div className="space-y-1.5">
          <Label>Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 101" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Schedule *</Label>
        <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Sun, Tue, Thu — 4:00 PM" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onDone && <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {group ? "حفظ التعديلات" : "Create group"}
        </Button>
      </div>
    </form>
  );
}
