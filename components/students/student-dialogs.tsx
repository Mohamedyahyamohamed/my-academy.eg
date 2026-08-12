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
import { StudentForm } from "./student-form";
import type { Group, Parent, Student } from "@/types";

export function AddStudentDialog({
  parents,
  groups,
}: {
  parents: Parent[];
  groups: Group[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> إضافة طالب
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة طالب جديد</DialogTitle>
          <DialogDescription>
            أنشئ ملف طالب وسجّله في المجموعات.
          </DialogDescription>
        </DialogHeader>
        <StudentForm
          parents={parents}
          groups={groups}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditStudentDialog({
  student,
  parents,
  groups,
}: {
  student: Student;
  parents: Parent[];
  groups: Group[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="تعديل الطالب">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطالب</DialogTitle>
          <DialogDescription>
            تحديث بيانات {student.first_name} وتسجيلاته في المجموعات.
          </DialogDescription>
        </DialogHeader>
        <StudentForm
          student={{
            ...student,
            groupIds: student.groups?.map((g) => g.id) ?? [],
          }}
          parents={parents}
          groups={groups}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
