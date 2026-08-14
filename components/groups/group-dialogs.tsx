"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GroupForm } from "./group-form";
import type { Course, Group, Teacher } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function AddGroupDialog({
  courses,
  teachers,
  defaultTeacherId,
  lockedTeacher,
  disabled,
}: {
  courses: Course[];
  teachers: Teacher[];
  defaultTeacherId?: string | null;
  lockedTeacher?: boolean;
  disabled?: boolean;
}) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}><Plus className="h-4 w-4" /> {en ? "New group" : "مجموعة جديدة"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en ? "Create group" : "إنشاء مجموعة"}</DialogTitle>
          <DialogDescription>{en ? "Organize students by course, teacher, and schedule." : "نظّم الطلاب حسب المادة والمدرّس والجدول."}</DialogDescription>
        </DialogHeader>
        <GroupForm
          courses={courses}
          teachers={teachers}
          defaultTeacherId={defaultTeacherId}
          lockedTeacher={lockedTeacher}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditGroupDialog({
  group,
  courses,
  teachers,
  defaultTeacherId,
  lockedTeacher,
}: {
  group: Group;
  courses: Course[];
  teachers: Teacher[];
  defaultTeacherId?: string | null;
  lockedTeacher?: boolean;
}) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> {en ? "Edit" : "تعديل"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en ? "Edit group" : "تعديل المجموعة"}</DialogTitle>
        </DialogHeader>
        <GroupForm
          group={group}
          courses={courses}
          teachers={teachers}
          defaultTeacherId={defaultTeacherId}
          lockedTeacher={lockedTeacher}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
