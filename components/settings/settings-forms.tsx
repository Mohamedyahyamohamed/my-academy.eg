"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { academySchema, courseSchema, type AcademyValues, type CourseValues } from "@/schemas";
import { updateAcademyAction, createCourseAction, deleteCourseAction } from "@/app/actions/settings";
import { APP_CONFIG } from "@/lib/constants";
import type { Academy, Course } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

const COLORS = ["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6", "#ec4899"];

export function AcademySettingsForm({ academy }: { academy: Academy }) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AcademyValues>({
    resolver: zodResolver(academySchema),
    defaultValues: {
      name: academy.name,
      email: academy.email ?? "",
      phone: academy.phone ?? "",
      address: academy.address ?? "",
      country: academy.country ?? "",
      currency: academy.currency,
    },
  });

  const onSubmit = async (values: AcademyValues) => {
    setSaving(true);
    try {
      await updateAcademyAction(values);
      toast.success(en ? "Academy settings saved." : "تم حفظ إعدادات الأكاديمية.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={en ? "Academy name" : "اسم الأكاديمية"} error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label={en ? "Currency" : "العملة"} error={errors.currency?.message}>
          <Input {...register("currency")} />
        </Field>
        <Field label={en ? "Email" : "البريد الإلكتروني"} error={errors.email?.message}>
          <Input {...register("email")} />
        </Field>
        <Field label={en ? "Phone" : "الموبايل"}>
          <Input {...register("phone")} />
        </Field>
        <Field label={en ? "Country" : "الدولة"}>
          <Input {...register("country")} />
        </Field>
        <Field label={en ? "Address" : "العنوان"}>
          <Input {...register("address")} />
        </Field>
      </div>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Save changes" : "حفظ التغييرات"}
      </Button>
    </form>
  );
}

export function CoursesManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [saving, setSaving] = React.useState(false);

  const create = async () => {
    if (!name.trim()) { toast.error(en ? "Name is required." : "الاسم مطلوب."); return; }
    setSaving(true);
    try {
      await createCourseAction({ name: name.trim(), description: desc.trim(), color });
      toast.success(en ? "Course created." : "تم إنشاء المادة.");
      setName(""); setDesc(""); setColor(COLORS[0]); setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-start rtl:justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> {en ? "Add course" : "إضافة مادة"}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{en ? "New course" : "مادة جديدة"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Field label={en ? "Name" : "الاسم"}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={en ? "e.g. Biology" : "مثال: أحياء"} /></Field>
              <Field label={en ? "Description" : "الوصف"}><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></Field>
              <Field label={en ? "Color" : "اللون"}>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} aria-label={c} />
                  ))}
                </div>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
              <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Create" : "إنشاء"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/40">
            <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: c.color ?? "#7c5cfc" }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.description ?? (en ? "No description" : "لا يوجد وصف")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={en ? "Delete course" : "حذف المادة"}
              onClick={async () => {
                await deleteCourseAction(c.id);
                toast.success(en ? "Course deleted." : "تم حذف المادة.");
                router.refresh();
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
