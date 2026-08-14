"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { examSchema, type ExamValues } from "@/schemas";
import { createExamAction } from "@/app/actions/grades";
import type { Course, Group } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function CreateExamDialog({ courses, groups }: { courses: Course[]; groups: Group[] }) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExamValues>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: "", course_id: "", group_id: "", date: new Date().toISOString().slice(0, 10), max_score: 50 },
  });
  const courseId = watch("course_id");

  const onSubmit = async (values: ExamValues) => {
    setSaving(true);
    try {
      const e = await createExamAction(values);
      toast.success(en ? "Exam created." : "تم إنشاء الاختبار.");
      setOpen(false);
      router.push(`/grades/${e.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {en ? "New exam" : "اختبار جديد"}</Button></DialogTrigger>
      <DialogContent dir={en ? "ltr" : "rtl"}>
        <DialogHeader>
          <DialogTitle>{en ? "Create exam" : "إنشاء اختبار"}</DialogTitle>
          <DialogDescription>{en ? "Set up an exam to enter grades for the group students." : "حدّد اختبارًا لإدخال درجات طلاب المجموعة."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>{en ? "Exam name *" : "اسم الاختبار *"}</Label>
            <Input {...register("name")} placeholder={en ? "e.g. Midterm algebra exam" : "مثال: اختبار الجبر النصفي"} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{en ? "Course *" : "المادة *"}</Label>
              <select {...register("course_id")} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{en ? "Choose…" : "اختر…"}</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.course_id && <p className="text-xs text-destructive">{errors.course_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Group *" : "المجموعة *"}</Label>
              <select {...register("group_id")} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{en ? "Choose…" : "اختر…"}</option>
                {groups.filter((g) => !courseId || g.course_id === courseId).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {errors.group_id && <p className="text-xs text-destructive">{errors.group_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Date *" : "التاريخ *"}</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Maximum score *" : "الدرجة النهائية *"}</Label>
              <Input type="number" min={1} step="any" {...register("max_score")} />
              {errors.max_score && <p className="text-xs text-destructive">{errors.max_score.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Create" : "إنشاء"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
