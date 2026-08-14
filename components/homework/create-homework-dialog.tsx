"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { homeworkSchema, type HomeworkValues } from "@/schemas";
import { createHomeworkAction } from "@/app/actions/homework";
import type { Group } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function CreateHomeworkDialog({ groups }: { groups: Group[] }) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<HomeworkValues>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: { title: "", description: "", group_id: "", deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) },
  });
  const groupId = watch("group_id");

  const onSubmit = async (values: HomeworkValues) => {
    setSaving(true);
    try {
      await createHomeworkAction({ ...values, deadline: new Date(values.deadline).toISOString() });
      toast.success(en ? "Homework added." : "تمت إضافة الواجب.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> {en ? "Add homework" : "إضافة واجب"}</Button></DialogTrigger>
      <DialogContent dir={en ? "ltr" : "rtl"}>
        <DialogHeader>
          <DialogTitle>{en ? "Add homework" : "إضافة واجب"}</DialogTitle>
          <DialogDescription>{en ? "Create homework for the group; students will see it immediately." : "أنشئ واجبًا للمجموعة؛ وسيظهر للطلاب فورًا."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>{en ? "Title *" : "العنوان *"}</Label>
            <Input {...register("title")} placeholder={en ? "e.g. Quadratic equations worksheet" : "مثال: ورقة عمل المعادلات التربيعية"} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Group *" : "المجموعة *"}</Label>
            <Controller control={control} name="group_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder={en ? "Choose group" : "اختر المجموعة"} /></SelectTrigger>
                <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.group_id && <p className="text-xs text-destructive">{errors.group_id.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Description *" : "الوصف *"}</Label>
            <Textarea {...register("description")} placeholder={en ? "Solve exercises 1 to 12 about representing quadratic equations." : "حلّ التمارين من 1 إلى 12 حول تمثيل المعادلات التربيعية."} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Due date *" : "موعد التسليم *"}</Label>
            <Input type="date" {...register("deadline")} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Assign" : "إسناد"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
