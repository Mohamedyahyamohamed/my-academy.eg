"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
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
import type { GroupInput } from "@/services/groups";
import { useClientLang } from "@/lib/i18n-client";
import { buildSchedule, formatClockTime, formatCurrency, parseSchedule } from "@/lib/utils";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const COLORS = ["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6", "#ec4899"];
const DAYS = [{ key: "sat", ar: "السبت", en: "Saturday" }, { key: "sun", ar: "الأحد", en: "Sunday" }, { key: "mon", ar: "الإثنين", en: "Monday" }, { key: "tue", ar: "الثلاثاء", en: "Tuesday" }, { key: "wed", ar: "الأربعاء", en: "Wednesday" }, { key: "thu", ar: "الخميس", en: "Thursday" }, { key: "fri", ar: "الجمعة", en: "Friday" }];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => { const minutes = index * 30; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; });

interface GroupFormProps {
  group?: Group;
  courses: Course[];
  teachers: Teacher[];
  /** Teacher id of the logged-in teacher (so creating a group auto-assigns them). */
  defaultTeacherId?: string | null;
  /** When true, the teacher field is locked to defaultTeacherId (teacher creating their own group). */
  lockedTeacher?: boolean;
  /** Existing scoped groups used to catch an accidental exact duplicate before save. */
  existingGroups?: Group[];
  onDone?: () => void;
}

export function GroupForm({
  group,
  courses,
  teachers,
  defaultTeacherId,
  lockedTeacher,
  existingGroups = [],
  onDone,
}: GroupFormProps) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<"form" | "review">(group ? "form" : "form");
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

  const selectedCourse = React.useMemo(
    () => courses.find((c) => c.name.trim().toLowerCase() === courseName.trim().toLowerCase()),
    [courses, courseName],
  );
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const selectedTeacherName = selectedTeacher
    ? `${selectedTeacher.first_name} ${selectedTeacher.last_name}`
    : lockedTeacherName;
  const schedule = React.useMemo(
    () => String(buildSchedule([...selectedDays], String(startTime), String(endTime))),
    [selectedDays, startTime, endTime],
  );

  const validateDraft = () => {
    const trimmedName = name.trim();
    const trimmedCourse = courseName.trim();
    const trimmedRoom = room.trim();
    const numericFee = fee.trim() === "" ? 0 : Number(fee);

    if (!trimmedName) return en ? "Group name is required." : "اسم المجموعة مطلوب.";
    if (trimmedName.length > 100) return en ? "Group name must be 100 characters or fewer." : "اسم المجموعة يجب ألا يتجاوز 100 حرف.";
    if (!trimmedCourse) return en ? "Course is required." : "المادة مطلوبة.";
    if (trimmedCourse.length > 80) return en ? "Course name must be 80 characters or fewer." : "اسم المادة يجب ألا يتجاوز 80 حرفًا.";
    if (!teacherId) return en ? "Teacher is required." : "المعلّم مطلوب.";
    if (selectedDays.length === 0) return en ? "Choose at least one day." : "اختر يومًا واحدًا على الأقل.";
    if (startTime === endTime) return en ? "Start and end time cannot be the same." : "وقت البداية والنهاية لا يمكن أن يكونا متساويين.";
    if (!Number.isFinite(numericFee) || numericFee < 0) return en ? "Enter a valid non-negative monthly fee." : "أدخل اشتراكًا شهريًا صحيحًا لا يقل عن صفر.";
    if (trimmedRoom.length > 60) return en ? "Room must be 60 characters or fewer." : "اسم القاعة يجب ألا يتجاوز 60 حرفًا.";
    const duplicate = existingGroups.some((existing) =>
      existing.name.trim().toLowerCase() === trimmedName.toLowerCase()
      && existing.course_id === selectedCourse?.id
      && existing.teacher_id === teacherId
      && String(existing.schedule ?? "") === schedule,
    );
    if (duplicate) return en ? "An identical group already exists with this teacher and schedule." : "توجد مجموعة مطابقة بالفعل لنفس المعلّم والموعد.";
    return null;
  };

  const save = async () => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      setStep("form");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      // Resolve the course only after the final confirmation. A new course is
      // never created just because the user opened or reviewed the form.
      let courseId = selectedCourse?.id;
      if (!courseId) {
        const created = await createCourseAction({
          name: courseName.trim(),
          color: String(courseColor),
        });
        courseId = created?.id;
        if (!courseId) throw new Error(en ? "Could not create course." : "تعذّر إنشاء المادة.");
      }

      // Keep the server-action boundary plain and JSON-compatible.
      const payload = {
        name: name.trim(),
        course_id: String(courseId),
        teacher_id: String(teacherId),
        monthly_fee: fee.trim() === "" ? 0 : Number(fee),
        schedule,
        room: room.trim() || undefined,
      } satisfies Omit<GroupInput, "academy_id">;
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
      // redirect() is implemented as a special thrown error. Let Next.js handle
      // it instead of showing NEXT_REDIRECT as a user-facing save failure.
      if (isRedirectError(err)) throw err;
      const message = err instanceof Error ? err.message : "تعذر تحديد سبب الخطأ من الخادم.";
      const lower = message.toLowerCase();
      const field = lower.includes("course") || lower.includes("مادة") ? (en ? "Course" : "المادة")
        : lower.includes("teacher") || lower.includes("معلّم") ? (en ? "Teacher" : "المعلّم")
          : lower.includes("academy") || lower.includes("authenticated") ? (en ? "Academy session" : "جلسة الأكاديمية")
            : lower.includes("group") ? (en ? "Group" : "المجموعة")
              : (en ? "Save operation" : "عملية الحفظ");
      const reason = /already exists|duplicate|unique/i.test(message)
        ? (en ? "A group with these details already exists." : "توجد مجموعة بهذه البيانات بالفعل.")
        : /limit reached/i.test(message)
          ? (en ? "The group limit for the current plan has been reached." : "تم الوصول إلى الحد الأقصى للمجموعات في الخطة الحالية.")
          : /outside|scope/i.test(message)
            ? (en ? "The selected value is outside the authenticated academy." : "القيمة المحددة خارج نطاق الأكاديمية الحالية.")
            : message;
      const detailed = en
        ? `The group could not be saved. Field: ${field}. Reason: ${reason} Details: ${message}`
        : `تعذر حفظ المجموعة. المكان: ${field}. السبب: ${reason} التفاصيل: ${message}`;
      setError(detailed);
      toast.error(detailed);
      setStep(group ? "form" : "review");
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      setStep("form");
      return;
    }
    if (!group) {
      setError(null);
      setStep("review");
      return;
    }
    await save();
  };

  if (!group && step === "review") {
    return (
      <div className="space-y-4" dir={en ? "ltr" : "rtl"}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">{en ? "Review the group before saving" : "راجع بيانات المجموعة قبل الحفظ"}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {en ? "Nothing has been saved yet. Confirm every detail below, then create the group." : "لم يتم حفظ أي شيء حتى الآن. تأكد من كل البيانات التالية، ثم أنشئ المجموعة."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">{en ? "Group name" : "اسم المجموعة"}</dt><dd className="mt-1 font-semibold">{name.trim()}</dd></div>
            <div><dt className="text-muted-foreground">{en ? "Course" : "المادة"}</dt><dd className="mt-1 font-semibold">{courseName.trim()}{!selectedCourse && <span className="ms-2 text-xs font-normal text-indigo-600">{en ? "new" : "جديدة"}</span>}</dd></div>
            <div><dt className="text-muted-foreground">{en ? "Teacher" : "المعلّم"}</dt><dd className="mt-1 font-semibold">{selectedTeacherName}</dd></div>
            <div><dt className="text-muted-foreground">{en ? "Monthly fee" : "الاشتراك الشهري"}</dt><dd className="mt-1 font-semibold">{formatCurrency(fee.trim() === "" ? 0 : Number(fee))}</dd></div>
            <div><dt className="text-muted-foreground">{en ? "Days" : "الأيام"}</dt><dd className="mt-1 font-semibold">{selectedDays.map((dayKey) => DAYS.find((day) => day.key === dayKey)?.[en ? "en" : "ar"]).filter(Boolean).join(en ? ", " : "، ")}</dd></div>
            <div><dt className="text-muted-foreground">{en ? "Time" : "الوقت"}</dt><dd className="mt-1 font-semibold">{formatClockTime(startTime, en ? "en-EG" : "ar-EG")} — {formatClockTime(endTime, en ? "en-EG" : "ar-EG")}</dd></div>
            {room.trim() && <div className="sm:col-span-2"><dt className="text-muted-foreground">{en ? "Room" : "القاعة"}</dt><dd className="mt-1 font-semibold">{room.trim()}</dd></div>}
          </dl>
        </div>

        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">{error}</div>}
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { setError(null); setStep("form"); }} disabled={saving}>
            <ChevronLeft className="h-4 w-4" /> {en ? "Back to edit" : "العودة للتعديل"}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {en ? "Confirm and create" : "تأكيد وإنشاء المجموعة"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate dir={en ? "ltr" : "rtl"}>
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
        {startTime !== endTime && startTime > endTime && (
          <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
            {en ? "This lesson ends the next day." : "هذه الحصة ستنتهي في اليوم التالي."}
          </p>
        )}
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
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {onDone && <Button type="button" variant="outline" onClick={onDone}>{en ? "Cancel" : "إلغاء"}</Button>}
        <Button type="submit" disabled={saving}>
          {group ? (en ? "Save changes" : "حفظ التعديلات") : (en ? "Review group" : "مراجعة المجموعة")}
        </Button>
      </div>
    </form>
  );
}
