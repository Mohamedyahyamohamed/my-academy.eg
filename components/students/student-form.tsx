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
  updateStudentAction,
} from "@/app/actions/students";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";
import type { Group, Parent } from "@/types";

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
  const [saving, setSaving] = React.useState(false);
  const [parents] = React.useState<Parent[]>(initialParents);
  const [parentMode, setParentMode] = React.useState<"existing" | "new">(
    student ? "existing" : "new",
  );
  const [newParent, setNewParent] = React.useState({ first_name: "", last_name: "", phone: "" });

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

  const onSubmit = async (values: StudentValues) => {
    setSaving(true);
    try {
      let parentId = values.parent_id ?? null;

      if (parentMode === "new") {
        const fn = newParent.first_name.trim();
        if (!fn) {
          toast.error("Parent first name is required");
          return;
        }
        const { createParentAction } = await import("@/app/actions/parents");
        const res = await createParentAction({
          first_name: fn,
          last_name: newParent.last_name.trim() || fn,
          phone: newParent.phone.trim() || undefined,
        });
        if (!res.ok) {
          toast.error(res.error ?? "Could not add parent");
          return;
        }
        parentId = res.parent!.id;
      } else if (!parentId) {
        toast.error("Please select a parent or add a new one");
        return;
      }

      const payload = { ...values, parent_id: parentId };
      if (student) {
        await updateStudentAction(student.id, payload);
        toast.success("Student updated");
      } else {
        const s = await createStudentAction(payload);
        toast.success(
          `تم إضافة ${s.first_name} ✅ — حساب الدخول: ${s.email} | الباسورد: ${STUDENT_DEFAULT_PASSWORD}`,
          { duration: 10000 },
        );
      }
      onDone?.();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.first_name?.message} required>
          <Input {...register("first_name")} placeholder="Ahmed" />
        </Field>
        <Field label="Last name" error={errors.last_name?.message} required>
          <Input {...register("last_name")} placeholder="Ali" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input {...register("phone")} placeholder="+20 100 000 0000" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} placeholder="student@email.com" />
        </Field>
        <Field label="Date of birth">
          <Input type="date" {...register("date_of_birth")} />
        </Field>
        <Field label="Gender">
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                value={field.value ?? "__none__"}
                onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Grade / Level">
          <Input {...register("grade")} placeholder="Grade 9" />
        </Field>
        <Field label="School">
          <Input {...register("school")} placeholder="School name" />
        </Field>
        <Field label="Parent / Guardian" required error={errors.parent_id?.message}>
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
              + New parent
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
              Existing
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
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No parent linked</SelectItem>
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
                  placeholder="Parent first name"
                  value={newParent.first_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, first_name: e.target.value }))}
                />
                <Input
                  placeholder="Parent last name"
                  value={newParent.last_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Parent phone (optional)"
                value={newParent.phone}
                onChange={(e) => setNewParent((p) => ({ ...p, phone: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The parent is created automatically when you save this student.
              </p>
            </div>
          )}
        </Field>
        <Field label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Groups" hint="Enroll this student into one or more groups">
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

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea {...register("notes")} placeholder="Internal notes about the student…" />
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
          <span className="font-medium">Parent/guardian consent *</span>
          <p className="text-xs text-muted-foreground">
            I confirm that the parent/guardian has consented to the collection and processing of this student's data in accordance with the <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
          </p>
        </div>
      </label>
      {errors.consent_given && <p className="text-xs text-destructive">{errors.consent_given.message}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {student ? "Save changes" : "Add student"}
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