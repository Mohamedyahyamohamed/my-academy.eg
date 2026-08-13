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

export function AddGroupDialog({
  courses,
  teachers,
  defaultTeacherId,
  lockedTeacher,
}: {
  courses: Course[];
  teachers: Teacher[];
  defaultTeacherId?: string | null;
  lockedTeacher?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> مجموعة جديدة</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء مجموعة</DialogTitle>
          <DialogDescription>نظّم الطلاب حسب المادة والمدرّس والجدول.</DialogDescription>
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
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> تعديل</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل المجموعة</DialogTitle>
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
