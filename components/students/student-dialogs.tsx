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
          <Plus className="h-4 w-4" /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add new student</DialogTitle>
          <DialogDescription>
            Create a student profile and enroll them into groups.
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
        <Button variant="ghost" size="icon-sm" aria-label="Edit student">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update {student.first_name}&apos;s information and enrollments.
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
