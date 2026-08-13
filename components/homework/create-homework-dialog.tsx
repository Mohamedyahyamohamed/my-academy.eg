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

export function CreateHomeworkDialog({ groups }: { groups: Group[] }) {
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
      toast.success("تمت إضافة الواجب.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> إضافة واجب</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة واجب</DialogTitle>
          <DialogDescription>أنشئ واجبًا للمجموعة؛ وسيظهر للطلاب فورًا.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>العنوان *</Label>
            <Input {...register("title")} placeholder="مثال: ورقة عمل المعادلات التربيعية" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>المجموعة *</Label>
            <Controller control={control} name="group_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
                <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.group_id && <p className="text-xs text-destructive">{errors.group_id.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>الوصف *</Label>
            <Textarea {...register("description")} placeholder="حلّ التمارين من 1 إلى 12 حول تمثيل المعادلات التربيعية." />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>موعد التسليم *</Label>
            <Input type="date" {...register("deadline")} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} إسناد</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
