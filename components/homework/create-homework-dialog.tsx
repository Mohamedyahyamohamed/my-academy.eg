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
      toast.success("Homework assigned");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Assign homework</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign homework</DialogTitle>
          <DialogDescription>Create an assignment for a group. Students will see it instantly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input {...register("title")} placeholder="Quadratics Worksheet" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Group *</Label>
            <Controller control={control} name="group_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.group_id && <p className="text-xs text-destructive">{errors.group_id.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea {...register("description")} placeholder="Solve problems 1–12 on graphing quadratics." />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Deadline *</Label>
            <Input type="date" {...register("deadline")} />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Assign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
