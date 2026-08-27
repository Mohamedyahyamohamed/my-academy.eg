"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studentSchema, type StudentValues } from "@/schemas";
import {
  createStudentAction,
  findStudentDuplicatesAction,
  updateStudentAction,
} from "@/app/actions/students";
import type { Group, Parent } from "@/types";
import { isActionFailure } from "@/lib/action-result";
import { useClientLang } from "@/lib/i18n-client";

interface StudentFormProps {
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    parent_id?: string | null;
    school?: string | null;
    grade?: string | null;
    notes?: string | null;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    groupIds?: string[];
    consent_given?: boolean;
  };
  parents: Parent[];
  groups: Group[];
  onDone?: () => void;
}

export function StudentForm({ student, parents: initialParents, groups, onDone }: StudentFormProps) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [saving, setSaving] = React.useState(false);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<Record<string, string>>({});
  const [parents] = React.useState<Parent[]>(initialParents);
  const [parentMode, setParentMode] = React.useState<"existing" | "new">(
    student ? "existing" : "new",
  );
  const [newParent, setNewParent] = React.useState({ first_name: "", last_name: "", phone: "" });
  const [duplicatePrompt, setDuplicatePrompt] = React.useState<{
    values: StudentValues;
    candidates: Array<{ id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null }>;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: student?.first_name ?? "",
      last_name: student?.last_name ?? "",
      phone: student?.phone ?? "",
      email: student?.email ?? "",
      date_of_birth: student?.date_of_birth?.slice(0, 10) ?? "",
      gender: student?.gender ?? undefined,
      parent_id: student?.parent_id ?? undefined,
      school: student?.school ?? "",
      grade: student?.grade ?? "",
      notes: student?.notes ?? "",
      status: student?.status ?? "ACTIVE",
      groupIds: student?.groupIds ?? [],
      consent_given: student?.consent_given ?? false,
    },
  });

  const saveStudent = async (values: StudentValues, duplicateChoice?: { mode: "update" | "create"; studentId?: string }) => {
    let parentId = values.parent_id ?? null;

    // لا ننشئ ولي الأمر الجديد إلا بعد انتهاء فحص التكرار، حتى لا نترك سجلاً يتيمًا.
    if (parentMode === "new") {
      const fn = newParent.first_name.trim();
      if (!fn) {
        toast.error(en ? "Parent first name is required." : "الاسم الأول لولي الأمر مطلوب.");
        return;
      }
      const { createParentAction } = await import("@/app/actions/parents");
      const res = await createParentAction({
        first_name: fn,
        last_name: newParent.last_name.trim() || fn,
        phone: newParent.phone.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? (en ? "Could not add the parent." : "تعذّر إضافة ولي الأمر."));
        return;
      }
      parentId = res.parent!.id;
    } else if (!parentId) {
      toast.error(en ? "Choose a parent or add a new one." : "اختر ولي أمر أو أضف ولي أمر جديدًا.");
      return;
    }

    const payload = { ...values, parent_id: parentId };
    if (student || duplicateChoice?.mode === "update") {
      const result = await updateStudentAction(student?.id ?? duplicateChoice?.studentId ?? "", payload);
      if (isActionFailure(result)) {
        setServerFieldErrors(result.fieldErrors ?? { form: result.error });
        toast.error(result.error);
        return;
      }
      if (!result) {
        const message = en ? "Student was not found in the current academy." : "لم يتم العثور على الطالب داخل الأكاديمية الحالية.";
        setServerFieldErrors({ form: message });
        toast.error(message);
        return;
      }
      toast.success(en ? "Student details updated." : "تم تحديث بيانات الطالب.");
    } else {
      const result = await createStudentAction(payload, { allowDuplicate: duplicateChoice?.mode === "create" });
      if ("duplicate" in result && result.duplicate) {
        setDuplicatePrompt({ values, candidates: result.candidates });
        return;
      }
      if (!("id" in result)) return;
      toast.success(
        en ? `Student ${result.first_name} added ✅ — Shared portal account: ${result.portal_email ?? result.email}` : `تم إضافة ${result.first_name} ✅ — تم إنشاء حساب البوابة المشترك: ${result.portal_email ?? result.email}`,
        { duration: 10000 },
      );
    }
    setDuplicatePrompt(null);
    onDone?.();
    router.refresh();
  };

  const onSubmit = async (values: StudentValues) => {
    setServerFieldErrors({});
    setSaving(true);
    try {
      if (!student) {
        if (!values.portal_email?.trim() || !values.portal_password?.trim()) {
          toast.error(en ? "Portal email and password are required for the first login." : "بريد وكلمة مرور البوابة مطلوبان عند إضافة الطالب لأول مرة.");
          return;
        }
        const candidates = await findStudentDuplicatesAction({ ...values, parent_id: values.parent_id ?? null });
        if (candidates.length > 0) {
          setDuplicatePrompt({ values, candidates });
          return;
        }
      }
      await saveStudent(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        /already exists|duplicate|unique/i.test(message)
          ? (en ? "A matching student was found. Choose update or new record." : "تم العثور على طالب مطابق. اختر التحديث أو سجل جديد.")
          : (en ? "Could not save the student. Check the information and try again." : "تعذّر حفظ بيانات الطالب. راجع البيانات وحاول مرة أخرى."),
      );
    } finally {
      setSaving(false);
    }
  };

  const resolveDuplicate = async (mode: "update" | "create", studentId?: string) => {
    if (!duplicatePrompt) return;
    setSaving(true);
    try {
      await saveStudent(duplicatePrompt.values, { mode, studentId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Could not resolve the matching student." : "تعذّر إتمام معالجة الطالب المطابق."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={en ? "First name" : "الاسم الأول"} error={errors.first_name?.message ?? serverFieldErrors.first_name} required>
          <Input {...register("first_name")} placeholder="Ahmed" />
        </Field>
        <Field label={en ? "Last name" : "اسم العائلة"} error={errors.last_name?.message ?? serverFieldErrors.last_name} required>
          <Input {...register("last_name")} placeholder="Ali" />
        </Field>
        <Field label={en ? "Phone" : "الموبايل"} error={errors.phone?.message ?? serverFieldErrors.phone}>
          <Input {...register("phone")} placeholder="+20 100 000 0000" />
        </Field>
        <Field label={en ? "Email" : "البريد الإلكتروني"} error={errors.email?.message ?? serverFieldErrors.email}>
          <Input type="email" {...register("email")} placeholder="student@email.com" />
        </Field>
        {!student && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2">
            <div>
              <p className="text-sm font-semibold text-primary">{en ? "Shared student & parent portal account" : "حساب البوابة المشترك للطالب وولي الأمر"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {en ? "These credentials are used from the public portal. The student or parent chooses the correct role after signing in. The password is stored securely and is never displayed again." : "بيانات الدخول دي تُستخدم من بوابة الدخول العامة. الطالب أو ولي الأمر يختار الدور المناسب بعد الدخول. كلمة المرور تُحفظ بشكل آمن ولن يتم عرضها مرة أخرى."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={en ? "Portal email" : "بريد دخول البوابة"} error={errors.portal_email?.message ?? serverFieldErrors.portal_email} required>
                <Input type="email" {...register("portal_email")} placeholder="parent@example.com" autoComplete="email" />
              </Field>
              <Field label={en ? "Portal password" : "كلمة مرور البوابة"} error={errors.portal_password?.message ?? serverFieldErrors.portal_password} required>
                <Input type="password" {...register("portal_password")} placeholder={en ? "At least 8 characters" : "8 أحرف على الأقل"} autoComplete="new-password" />
              </Field>
            </div>
          </div>
        )}
        <Field label={en ? "Date of birth" : "تاريخ الميلاد"} error={serverFieldErrors.date_of_birth}>
          <Input type="date" {...register("date_of_birth")} />
        </Field>
        <Field label={en ? "Gender" : "النوع"} error={errors.gender?.message ?? serverFieldErrors.gender}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                value={field.value ?? "__none__"}
                onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={en ? "Choose" : "اختر"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{en ? "Not specified" : "غير محدد"}</SelectItem>
                  <SelectItem value="male">{en ? "Male" : "ذكر"}</SelectItem>
                  <SelectItem value="female">{en ? "Female" : "أنثى"}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label={en ? "Grade / level" : "الصف / المستوى"} error={errors.grade?.message ?? serverFieldErrors.grade}>
          <Input {...register("grade")} placeholder={en ? "e.g. Grade 9" : "مثال: الصف الثالث الإعدادي"} />
        </Field>
        <Field label={en ? "School" : "المدرسة"} error={errors.school?.message ?? serverFieldErrors.school}>
          <Input {...register("school")} placeholder={en ? "School name" : "اسم المدرسة"} />
        </Field>
        <Field label={en ? "Parent or guardian" : "ولي الأمر أو الوصي"} required error={errors.parent_id?.message ?? serverFieldErrors.parent_id}>
          <div className="mb-2 flex gap-1 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setParentMode("new")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                parentMode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {en ? "+ New parent" : "+ ولي أمر جديد"}
            </button>
            <button
              type="button"
              onClick={() => setParentMode("existing")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                parentMode === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {en ? "Existing" : "ولي أمر موجود"}
            </button>
          </div>

          {parentMode === "existing" ? (
            <Controller
              control={control}
              name="parent_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={en ? "Choose parent" : "اختر ولي الأمر"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{en ? "No linked parent" : "لا يوجد ولي أمر مرتبط"}</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={en ? "Parent first name" : "اسم ولي الأمر الأول"}
                  value={newParent.first_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, first_name: e.target.value }))}
                />
                <Input
                  placeholder={en ? "Parent last name" : "اسم عائلة ولي الأمر"}
                  value={newParent.last_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
              <Input
                placeholder={en ? "Parent phone (optional)" : "موبايل ولي الأمر (اختياري)"}
                value={newParent.phone}
                onChange={(e) => setNewParent((p) => ({ ...p, phone: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {en ? "The parent is created automatically when you save this student." : "سيتم إنشاء ولي الأمر تلقائيًا عند حفظ الطالب."}
              </p>
            </div>
          )}
        </Field>
        <Field label={en ? "Status" : "الحالة"} error={serverFieldErrors.status}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{en ? "Active" : "نشط"}</SelectItem>
                  <SelectItem value="INACTIVE">{en ? "Inactive" : "غير نشط"}</SelectItem>
                  <SelectItem value="ARCHIVED">{en ? "Archived" : "مؤرشف"}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label={en ? "Groups" : "المجموعات"} hint={en ? "Enroll the student in one or more groups" : "سجّل الطالب في مجموعة واحدة أو أكثر"}>
        <Controller
          control={control}
          name="groupIds"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((g) => {
                const checked = field.value?.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2.5 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(field.value ?? []);
                        if (v) next.add(g.id);
                        else next.delete(g.id);
                        field.onChange([...next]);
                      }}
                    />
                    <span className="flex-1 truncate">{g.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
      </Field>

      {duplicatePrompt && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <div>
            <p className="font-semibold">{en ? "A matching student already exists" : "يوجد طالب مطابق بالفعل"}</p>
            <p className="mt-1 text-xs text-amber-900">
              {en ? "Choose whether this row updates an existing student or is intentionally added as a new record." : "اختار هل البيانات دي تحديث لطالب موجود، ولا طالب جديد بقصد واضح. لن يتم إنشاء سجل تلقائيًا."}
            </p>
          </div>
          <div className="space-y-2">
            {duplicatePrompt.candidates.map((candidate) => (
              <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white p-2">
                <span>{candidate.first_name} {candidate.last_name}{candidate.phone ? ` — ${candidate.phone}` : ""}</span>
                <Button type="button" size="sm" onClick={() => resolveDuplicate("update", candidate.id)} disabled={saving}>
                  {en ? "Update this record" : "تحديث السجل الموجود"}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => resolveDuplicate("create")} disabled={saving}>
              {en ? "Add as a new student" : "إضافته كطالب جديد"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDuplicatePrompt(null)} disabled={saving}>
              {en ? "Cancel" : "إلغاء"}
            </Button>
          </div>
        </div>
      )}

      <Field label={en ? "Notes" : "ملاحظات"} error={errors.notes?.message ?? serverFieldErrors.notes}>
        <Textarea {...register("notes")} placeholder={en ? "Internal notes about the student…" : "ملاحظات داخلية عن الطالب…"} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
        <Controller
          control={control}
          name="consent_given"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <div className="text-sm">
          <span className="font-medium">{en ? "Parent or guardian consent *" : "موافقة ولي الأمر أو الوصي *"}</span>
          <p className="text-xs text-muted-foreground">
            {en ? <>I confirm that the parent or guardian consented to collecting and processing this student&apos;s data under the <a href="/privacy" className="text-primary underline">Privacy Policy</a>.</> : <>أقرّ بأن ولي الأمر أو الوصي وافق على جمع بيانات هذا الطالب ومعالجتها وفقًا لـ <a href="/privacy" className="text-primary underline">سياسة الخصوصية</a>.</>}
          </p>
        </div>
      </label>
      {(errors.consent_given?.message ?? serverFieldErrors.consent_given) && <p className="text-xs text-destructive">{errors.consent_given?.message ?? serverFieldErrors.consent_given}</p>}

      {serverFieldErrors.form && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive" role="alert">{serverFieldErrors.form}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            {en ? "Cancel" : "إلغاء"}
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {student ? (en ? "Save changes" : "حفظ التعديلات") : (en ? "Add student" : "إضافة طالب")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
