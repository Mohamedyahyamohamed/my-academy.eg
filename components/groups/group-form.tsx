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
import { useClientLang } from "@/lib/i18n-client";
import { buildSchedule, formatClockTime, parseSchedule } from "@/lib/utils";

const COLORS = ["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6", "#ec4899"];
const DAYS = [{ key: "sat", ar: "السبت", en: "Saturday" }, { key: "sun", ar: "الأحد", en: "Sunday" }, { key: "mon", ar: "الإثنين", en: "Monday" }, { key: "tue", ar: "الثلاثاء", en: "Tuesday" }, { key: "wed", ar: "الأربعاء", en: "Wednesday" }, { key: "thu", ar: "الخميس", en: "Thursday" }, { key: "fri", ar: "الجمعة", en: "Friday" }];
const TIME_OPTIONS = Array.from({ length: 29 }, (_, index) => { const minutes = 6 * 60 + index * 30; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; });

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
  const en = useClientLang() === "en";
  const [saving, setSaving] = React.useState(false);
  const existingCourse = group ? courses.find((c) => c.id === group.course_id) : undefined;
  const [courseName, setCourseName] = React.useState(existingCourse?.name ?? "");
  const [courseColor, setCourseColor] = React.useState(existingCourse?.color ?? COLORS[0]);
  const [teacherId, setTeacherId] = React.useState(
    group?.teacher_id ?? defaultTeacherId ?? "",
  );
  const [name, setName] = React.useState(group?.name ?? "");
  const [fee, setFee] = React.useState(String(group?.monthly_fee ?? ""));
  const parsedSchedule = parseSchedule(group?.schedule);
  const [selectedDays, setSelectedDays] = React.useState<string[]>(parsedSchedule?.days ?? []);
  const [startTime, setStartTime] = React.useState(parsedSchedule?.start ?? "16:00");
  const [endTime, setEndTime] = React.useState(parsedSchedule?.end ?? "17:30");
  const [room, setRoom] = React.useState(group?.room ?? "");

  const lockedTeacherName = React.useMemo(() => {
    const t = teachers.find((x) => x.id === defaultTeacherId);
    return t ? `${t.first_name} ${t.last_name}` : (en ? "You" : "أنت");
  }, [teachers, defaultTeacherId, en]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(en ? "Group name is required." : "اسم المجموعة مطلوب.");
    if (!courseName.trim()) return toast.error(en ? "Course is required." : "المادة مطلوبة.");
    if (!teacherId) return toast.error(en ? "Teacher is required." : "المعلّم مطلوب.");
    if (selectedDays.length === 0) return toast.error(en ? "Choose at least one day." : "اختر يومًا واحدًا على الأقل.");
    if (startTime >= endTime) return toast.error(en ? "End time must be after start time." : "وقت النهاية يجب أن يكون بعد وقت البداية.");

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
        if (!courseId) throw new Error(en ? "Could not create course." : "تعذّر إنشاء المادة.");
      }

      const payload = {
        name: name.trim(),
        course_id: courseId,
        teacher_id: teacherId,
        monthly_fee: Number(fee) || 0,
        schedule: buildSchedule(selectedDays, startTime, endTime),
        room: room.trim() || undefined,
      };
      if (group) {
        await updateGroupAction(group.id, payload);
        toast.success(en ? "Group updated." : "تم تحديث المجموعة.");
      } else {
        await createGroupAction(payload);
        toast.success(en ? "Group created." : "تم إنشاء المجموعة.");
      }
      onDone?.();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || (en ? "An unexpected error occurred." : "حدث خطأ غير متوقع."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label>{en ? "Group name *" : "اسم المجموعة *"}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={en ? "e.g. Grade 9 — Mathematics A" : "مثال: الصف الثالث الإعدادي — رياضيات أ"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Course: free text the first time, autocomplete afterwards */}
        <div className="space-y-1.5">
          <Label>{en ? "Course *" : "المادة *"}</Label>
          <Input
            list="courses-list"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder={en ? "Enter or choose a course" : "اكتب مادة جديدة أو اختر مادة"}
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
            {en ? "Enter a course name once and it will be available in your choices next time." : "اكتب اسم الكورس أول مرة → هيتحفظ ويبقى موجود في اختياراتك بعد كده."}
          </p>
        </div>

        {/* Teacher: auto = you when a teacher creates the group */}
        <div className="space-y-1.5">
          <Label>{en ? "Teacher *" : "المعلّم *"}</Label>
          {lockedTeacher ? (
            <Input value={lockedTeacherName} disabled className="bg-muted" />
          ) : (
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder={en ? "Choose teacher" : "اختر المعلّم"} /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{en ? "Monthly fee" : "الاشتراك الشهري"}</Label>
          <Input type="number" min={0} step="any" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="1200" />
        </div>
        <div className="space-y-1.5">
          <Label>{en ? "Room" : "القاعة"}</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder={en ? "e.g. Room 101" : "مثال: قاعة 101"} />
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <Label>{en ? "Days *" : "الأيام *"}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{en ? "Choose all days for this group." : "اختر كل أيام المجموعة."}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAYS.map((day) => {
            const checked = selectedDays.includes(day.key);
            return <button key={day.key} type="button" onClick={() => setSelectedDays((current) => checked ? current.filter((item) => item !== day.key) : [...current, day.key])} className={`rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`} aria-pressed={checked}>{en ? day.en : day.ar}</button>;
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{en ? "Start time *" : "وقت البداية *"}</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_OPTIONS.map((time) => <SelectItem key={time} value={time}>{formatClockTime(time, en ? "en-EG" : "ar-EG")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "End time *" : "وقت النهاية *"}</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_OPTIONS.map((time) => <SelectItem key={time} value={time}>{formatClockTime(time, en ? "en-EG" : "ar-EG")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {group?.schedule && !parsedSchedule && <p className="text-xs text-amber-600">{en ? "This group uses an older free-text schedule. Choose the days and times to standardize it." : "هذه المجموعة تستخدم موعدًا قديمًا مكتوبًا يدويًا. اختر الأيام والأوقات لتوحيده."}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onDone && <Button type="button" variant="outline" onClick={onDone}>{en ? "Cancel" : "إلغاء"}</Button>}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {group ? (en ? "Save changes" : "حفظ التعديلات") : (en ? "Create group" : "إنشاء المجموعة")}
        </Button>
      </div>
    </form>
  );
}
