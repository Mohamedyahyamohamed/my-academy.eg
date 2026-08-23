"use client";

import * as React from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStudentToGroupAction } from "@/app/actions/groups";
import { useRouter } from "next/navigation";
import type { Student } from "@/types";
import { useClientLang } from "@/lib/i18n-client";
import { filterAvailableStudents, toggleVisibleSelection, type GenderFilter } from "@/lib/student-filters";
import { GLOBAL_GRADE_OPTIONS } from "@/lib/student-grades";

export function AddStudentToGroupDialog({
  groupId,
  availableStudents,
}: {
  groupId: string;
  availableStudents: Student[];
}) {
  const [open, setOpen] = React.useState(false);
  const en = useClientLang() === "en";
  const [selected, setSelected] = React.useState<string[]>([]);
  const [nameQuery, setNameQuery] = React.useState("");
  const [gradeFilter, setGradeFilter] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<GenderFilter>("all");
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const grades = GLOBAL_GRADE_OPTIONS;
  const filteredStudents = React.useMemo(
    () => filterAvailableStudents(availableStudents, nameQuery, gradeFilter, genderFilter),
    [availableStudents, nameQuery, gradeFilter, genderFilter],
  );

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
      if (added > 0) toast.success(en ? `Added ${added} student${added === 1 ? "" : "s"} to the group` : `تم إضافة ${added} طالب للجروب`);
      if (errors.length > 0) toast.error(errors[0]);
      setSelected([]);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setNameQuery("");
    setGradeFilter("");
    setGenderFilter("all");
  };

  const visibleStudentIds = filteredStudents.map((student) => student.id);
  const selectedVisibleCount = visibleStudentIds.filter((id) => selected.includes(id)).length;
  const allVisibleSelected = visibleStudentIds.length > 0 && selectedVisibleCount === visibleStudentIds.length;
  const toggleAllVisible = () => {
    setSelected((current) => toggleVisibleSelection(current, visibleStudentIds));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={availableStudents.length === 0}>
          <UserPlus className="me-2 h-4 w-4" /> {en ? "Add student" : "إضافة طالب"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{en ? "Add students to group" : "إضافة طلاب إلى المجموعة"}</DialogTitle>
          <DialogDescription>{en ? "Filter by name, grade, or gender, then choose the students to enroll." : "فلتر بالاسم أو الصف أو النوع، ثم اختر الطلاب المطلوب تسجيلهم."}</DialogDescription>
        </DialogHeader>
        {availableStudents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {en ? "All students are already enrolled." : "كل الطلاب مسجلون بالفعل."}
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3" role="search" aria-label={en ? "Student filters" : "فلاتر الطلاب"}>
              <Input
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder={en ? "Search by name" : "بحث بالاسم"}
                aria-label={en ? "Search by student name" : "البحث باسم الطالب"}
              />
              <Select value={gradeFilter || "all-grades"} onValueChange={(value) => setGradeFilter(value === "all-grades" ? "" : value)}>
                <SelectTrigger aria-label={en ? "Filter by grade" : "فلترة بالصف"}>
                  <SelectValue placeholder={en ? "All grades" : "كل الصفوف"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-grades">{en ? "All grades" : "كل الصفوف"}</SelectItem>
                  {grades.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={genderFilter} onValueChange={(value) => setGenderFilter(value as GenderFilter)}>
                <SelectTrigger aria-label={en ? "Filter by gender" : "فلترة بالنوع"}>
                  <SelectValue placeholder={en ? "All genders" : "الكل"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{en ? "All genders" : "الكل"}</SelectItem>
                  <SelectItem value="male">{en ? "Male" : "ذكر"}</SelectItem>
                  <SelectItem value="female">{en ? "Female" : "أنثى"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(nameQuery || gradeFilter || genderFilter !== "all") && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{en ? `${filteredStudents.length} of ${availableStudents.length} students` : `${filteredStudents.length} من ${availableStudents.length} طالب`}</span>
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>{en ? "Clear filters" : "مسح الفلاتر"}</Button>
              </div>
            )}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={allVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false}
                    onCheckedChange={toggleAllVisible}
                    aria-label={en ? "Select all filtered students" : "تحديد كل الطلاب الظاهرين بعد الفلترة"}
                  />
                  <span>{allVisibleSelected ? (en ? "Deselect visible" : "إلغاء تحديد الظاهرين") : (en ? "Select all visible" : "تحديد كل الظاهرين")}</span>
                </label>
                <span className="text-xs text-muted-foreground">
                  {en ? `${selectedVisibleCount} selected from ${filteredStudents.length}` : `${selectedVisibleCount} محدد من ${filteredStudents.length}`}
                </span>
              </div>
            )}
            {filteredStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {en ? "No students match these filters." : "لا يوجد طلاب مطابقون لهذه الفلاتر."}
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredStudents.map((s) => {
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
                            v ? (cur.includes(s.id) ? cur : [...cur, s.id]) : cur.filter((x) => x !== s.id),
                          )
                        }
                      />
                      <Label className="cursor-pointer">
                        {s.first_name} {s.last_name}
                        <span className="ms-2 text-xs text-muted-foreground">
                          {s.grade || (en ? "No grade" : "بدون صف")} {s.gender ? `· ${s.gender === "male" ? (en ? "Male" : "ذكر") : (en ? "Female" : "أنثى")}` : ""}
                        </span>
                      </Label>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
          <Button onClick={submit} disabled={saving || !selected.length}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} {en ? "Add" : "إضافة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
