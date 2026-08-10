"use client";

import * as React from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { addStudentToGroupAction } from "@/app/actions/groups";
import { useRouter } from "next/navigation";
import type { Student } from "@/types";

export function AddStudentToGroupDialog({
  groupId,
  availableStudents,
}: {
  groupId: string;
  availableStudents: Student[];
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const submit = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      let added = 0;
      const errors: string[] = [];
      for (const id of selected) {
        const res = await addStudentToGroupAction(groupId, id);
        if (res?.ok) added++;
        else if (res?.error) errors.push(res.error);
      }
      if (added > 0) toast.success(`تم إضافة ${added} طالب للجروب`);
      if (errors.length > 0) toast.error(errors[0]);
      setSelected([]);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={availableStudents.length === 0}>
          <UserPlus className="h-4 w-4" /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add students to group</DialogTitle>
          <DialogDescription>Select students to enroll.</DialogDescription>
        </DialogHeader>
        {availableStudents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            All students are already enrolled.
          </p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {availableStudents.map((s) => {
              const checked = selected.includes(s.id);
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-accent/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setSelected((cur) =>
                        v ? [...cur, s.id] : cur.filter((x) => x !== s.id),
                      )
                    }
                  />
                  <Label className="cursor-pointer">
                    {s.first_name} {s.last_name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {s.grade}
                    </span>
                  </Label>
                </label>
              );
            })}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !selected.length}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
