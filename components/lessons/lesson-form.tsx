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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lessonSchema, type LessonValues } from "@/schemas";
import { createLessonAction, updateLessonAction } from "@/app/actions/lessons";
import type { Group, Lesson, Teacher } from "@/types";

interface LessonFormProps {
  lesson?: Lesson;
  groups: Group[];
  teachers: Teacher[];
  defaultGroupId?: string;
  onDone?: () => void;
}

export function LessonForm({ lesson, groups, teachers, defaultGroupId, onDone }: LessonFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LessonValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      group_id: lesson?.group_id ?? defaultGroupId ?? "",
      teacher_id: lesson?.teacher_id ?? groups.find((g) => g.id === (lesson?.group_id ?? defaultGroupId))?.teacher_id ?? "",
      date: lesson?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      start_time: lesson?.start_time ?? "16:00",
      end_time: lesson?.end_time ?? "17:30",
      topic: lesson?.topic ?? "",
      description: lesson?.description ?? "",
      notes: lesson?.notes ?? "",
    },
  });

  const groupId = watch("group_id");

  const onSubmit = async (values: LessonValues) => {
    setSaving(true);
    try {
      if (lesson) {
        await updateLessonAction(lesson.id, values);
        toast.success("Lesson updated");
        onDone?.();
      } else {
        const l = await createLessonAction(values);
        toast.success("Lesson created");
        router.push(`/lessons/${l.id}`);
      }
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
        <Field label="Group" error={errors.group_id?.message} required>
          <Controller
            control={control}
            name="group_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  const t = groups.find((g) => g.id === v)?.teacher_id;
                  if (t) {
                    setValue("teacher_id", t);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Teacher" error={errors.teacher_id?.message} required>
          <Controller
            control={control}
            name="teacher_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Date" error={errors.date?.message} required>
          <Input type="date" {...register("date")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" error={errors.start_time?.message} required>
            <Input type="time" {...register("start_time")} />
          </Field>
          <Field label="End" error={errors.end_time?.message} required>
            <Input type="time" {...register("end_time")} />
          </Field>
        </div>
      </div>
      <Field label="Topic" error={errors.topic?.message} required>
        <Input {...register("topic")} placeholder="e.g. Linear Equations" />
      </Field>
      <Field label="Description">
        <Textarea {...register("description")} placeholder="What will be covered in this lesson?" />
      </Field>
      <Field label="Notes">
        <Textarea {...register("notes")} placeholder="Private teaching notes…" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        {onDone && <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {lesson ? "Save changes" : "Create lesson"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
