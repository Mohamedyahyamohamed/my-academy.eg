import Link from "next/link";
import { ChevronDown, GraduationCap, Users, UserRound, UserRoundCog, Building2 } from "lucide-react";

export type PlatformHierarchyStudent = {
  id: string;
  name: string;
  email: string | null;
  status: string;
};

export type PlatformHierarchyAssistant = {
  id: string;
  name: string;
  email: string | null;
  groups: string[];
};

export type PlatformHierarchyGroup = {
  id: string;
  name: string;
  students: PlatformHierarchyStudent[];
  assistants: PlatformHierarchyAssistant[];
};

export type PlatformHierarchyTeacher = {
  id: string;
  profileId: string | null;
  name: string;
  email: string | null;
  isActive: boolean;
  groups: PlatformHierarchyGroup[];
};

export type PlatformHierarchyOwner = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  teachers: PlatformHierarchyTeacher[];
};

export type PlatformHierarchyAcademy = {
  id: string;
  name: string;
  workspaceType: string;
  owners: PlatformHierarchyOwner[];
  teachers: PlatformHierarchyTeacher[];
};

function countStudents(teachers: PlatformHierarchyTeacher[]) {
  return teachers.reduce((total, teacher) => total + teacher.groups.reduce((groupTotal, group) => groupTotal + group.students.length, 0), 0);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—";
}

function PersonMeta({ name, email, role, active }: { name: string; email: string | null; role: string; active: boolean }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{name}</span>
      <span className="block truncate text-xs text-muted-foreground">{email || "بدون بريد"} · {role} · {active ? "نشط" : "موقوف"}</span>
    </span>
  );
}

function TeacherTree({ teacher, en }: { teacher: PlatformHierarchyTeacher; en: boolean }) {
  const studentCount = teacher.groups.reduce((total, group) => total + group.students.length, 0);
  const assistantCount = new Set(teacher.groups.flatMap((group) => group.assistants.map((assistant) => assistant.id))).size;
  return (
    <details className="group rounded-lg border bg-background/80" open={teacher.groups.length > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{initials(teacher.name)}</span>
        <PersonMeta name={teacher.name} email={teacher.email} role={en ? "Teacher" : "مدرس"} active={teacher.isActive} />
        <span className="ms-auto flex shrink-0 gap-2 text-xs text-muted-foreground">
          <span>{teacher.groups.length} {en ? "groups" : "مجموعات"}</span>
          <span>{assistantCount} {en ? "assistants" : "مساعد"}</span>
          <span>{studentCount} {en ? "students" : "طالب"}</span>
        </span>
      </summary>
      <div className="space-y-3 border-t p-3 pe-4 sm:pe-12">
        {teacher.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{en ? "No groups assigned." : "لا توجد مجموعات مرتبطة بهذا المدرس."}</p>
        ) : teacher.groups.map((group) => (
          <details key={group.id} className="group rounded-md border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="font-medium">{group.name}</span>
              <span className="ms-auto text-xs text-muted-foreground">{group.students.length} {en ? "students" : "طالب"} · {group.assistants.length} {en ? "assistants" : "مساعد"}</span>
            </summary>
            <div className="grid gap-3 border-t p-3 md:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><UserRoundCog className="h-4 w-4" />{en ? "Assistants" : "المساعدون"}</p>
                {group.assistants.length === 0 ? <p className="text-sm text-muted-foreground">{en ? "No assistants." : "لا يوجد مساعدون."}</p> : (
                  <div className="space-y-2">
                    {group.assistants.map((assistant) => (
                      <details key={assistant.id} className="rounded-md border bg-background p-2">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                          <ChevronDown className="h-3 w-3" />
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">{initials(assistant.name)}</span>
                          <span className="min-w-0"><span className="block truncate font-medium">{assistant.name}</span><span className="block truncate text-xs text-muted-foreground">{assistant.email || "بدون بريد"}</span></span>
                        </summary>
                        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{en ? `Assigned to ${assistant.groups.length} group(s).` : `مرتبط بـ ${assistant.groups.length} مجموعة.`}</p>
                      </details>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Users className="h-4 w-4" />{en ? "Students" : "الطلاب"}</p>
                {group.students.length === 0 ? <p className="text-sm text-muted-foreground">{en ? "No students." : "لا يوجد طلاب."}</p> : (
                  <div className="space-y-2">
                    {group.students.map((student) => (
                      <Link href={`/students/${student.id}`} key={student.id} className="flex items-center gap-2 rounded-md border bg-background p-2 transition-colors hover:border-primary/40 hover:bg-accent">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-700">{initials(student.name)}</span>
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{student.name}</span><span className="block truncate text-xs text-muted-foreground">{student.email || "بدون بريد"} · {student.status}</span></span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

function OwnerTree({ owner, en }: { owner: PlatformHierarchyOwner; en: boolean }) {
  const studentCount = countStudents(owner.teachers);
  return (
    <details className="group rounded-xl border bg-background" open>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{initials(owner.name)}</span>
        <PersonMeta name={owner.name} email={owner.email} role={en ? "Academy owner" : "صاحب الأكاديمية"} active={owner.isActive} />
        <span className="ms-auto text-xs text-muted-foreground">{owner.teachers.length} {en ? "teachers" : "مدرسين"} · {studentCount} {en ? "students" : "طالب"}</span>
      </summary>
      <div className="space-y-3 border-t p-3 sm:p-4 sm:pe-14">
        <p className="text-xs font-semibold text-muted-foreground">{en ? "Teachers, assistants, groups, and students" : "المدرسون والمساعدون والمجموعات والطلاب"}</p>
        {owner.teachers.map((teacher) => <TeacherTree key={teacher.id} teacher={teacher} en={en} />)}
      </div>
    </details>
  );
}

export function PlatformUserHierarchy({ en, academies }: { en: boolean; academies: PlatformHierarchyAcademy[] }) {
  return (
    <div className="space-y-4">
      {academies.map((academy) => {
        const teachers = academy.teachers;
        const studentCount = countStudents(teachers);
        return (
          <details key={academy.id} className="group rounded-xl border bg-muted/10" open>
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Building2 className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block truncate font-semibold">{academy.name}</span><span className="block text-xs text-muted-foreground">{academy.workspaceType === "TEACHER" ? (en ? "Teacher workspace" : "مساحة مدرس") : (en ? "Academy workspace" : "مساحة أكاديمية")} · {academy.owners.length} {en ? "owners" : "مالك"}</span></span>
              <span className="ms-auto shrink-0 text-xs text-muted-foreground">{teachers.length} {en ? "teachers" : "مدرسين"} · {studentCount} {en ? "students" : "طالب"}</span>
            </summary>
            <div className="space-y-3 border-t p-3 sm:p-4 sm:pe-14">
              {academy.owners.length === 0 ? <p className="text-sm text-muted-foreground">{en ? "Owner profile not linked yet." : "لم يتم ربط ملف مالك بهذه الأكاديمية بعد."}</p> : academy.owners.map((owner) => <OwnerTree key={owner.id} owner={owner} en={en} />)}
            </div>
          </details>
        );
      })}
      {academies.length === 0 && <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{en ? "No managed academies yet." : "لا توجد أكاديميات مُدارة بعد."}</p>}
    </div>
  );
}
