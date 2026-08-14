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
import { useClientLang } from "@/lib/i18n-client";

export function AddStudentDialog({
  parents,
  groups,
}: {
  parents: Parent[];
  groups: Group[];
}) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {en ? "Add student" : "إضافة طالب"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{en ? "Add new student" : "إضافة طالب جديد"}</DialogTitle>
          <DialogDescription>
            {en ? "Create a student profile and enroll them in groups." : "أنشئ ملف طالب وسجّله في المجموعات."}
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
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={en ? "Edit student" : "تعديل الطالب"}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{en ? "Edit student details" : "تعديل بيانات الطالب"}</DialogTitle>
          <DialogDescription>
            {en ? `Update ${student.first_name}'s details and group enrollments.` : `تحديث بيانات ${student.first_name} وتسجيلاته في المجموعات.`}
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
