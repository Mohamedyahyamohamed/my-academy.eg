import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, collections } from "@/services/data/store";
import { createSeedData, type SeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { getStudent, createStudent, updateStudent } from "@/services/students";
import { getGroup, createGroup, updateGroup, deleteGroup } from "@/services/groups";
import { getLesson, createLesson, updateLesson, deleteLesson } from "@/services/lessons";
import { getAttendanceSheet, saveAttendance, studentAttendanceSummary } from "@/services/attendance";
import { getHomework, createHomework, deleteHomework } from "@/services/homework";
import { getExam, createExam, deleteExam, saveGrades, listGrades } from "@/services/grades";
import { addNote, notesForStudent, deleteNote, listParents, createParent, listCourses, createCourse, updateCourse, deleteCourse } from "@/services/misc";
import { getPayment, createPayment, deletePayment, listPayments } from "@/services/payments";
import { getInbox, sendMessage } from "@/services/messaging";
import { getCourse as getContentCourse, getContentFile, createCourse as createContentCourse, createLesson as createContentLesson, listContentFiles } from "@/services/content";

const A = "academy-1";
const B = "academy-b";
const A_USER = {
  id: "prof-admin",
  email: "admin@myacademy.edu",
  role: "ADMIN",
  full_name: "Synthetic Academy A Admin",
  academy_id: A,
} as any;
const B_USER = {
  id: "prof-admin-b",
  email: "admin-b@test.com",
  role: "ADMIN",
  full_name: "Synthetic Academy B Admin",
  academy_id: B,
} as any;

function now() { return new Date().toISOString(); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function snapshot() { return clone(db.data); }
function useTenant(academy: string) { ACTIVE_USER = academy === A ? A_USER : B_USER; setRequestContext(ACTIVE_USER); }
function target(academy: string) { return academy === A ? A_FIXTURES : B_FIXTURES; }
function currentData(): SeedData { return collections(); }
type MatrixOperation = () => Promise<unknown> | unknown;
type MatrixReader = (id: string) => Promise<unknown> | unknown;

function expectDeniedAndUnchanged(operation: MatrixOperation) {
  const before = snapshot();
  return Promise.resolve().then(operation).then(
    (result: any) => {
      const explicitlyDenied = result === false || result === null || (result && result.ok === false);
      if (!explicitlyDenied) throw new Error("Expected cross-tenant operation to be denied");
      expect(snapshot()).toEqual(before);
    },
    (error) => {
      expect(String(error?.message ?? error)).toMatch(/academy|outside|scope|permission|not available|not found|enrolled|authenticated|allowed|only|invalid/i);
      expect(snapshot()).toEqual(before);
    },
  );
}

let A_FIXTURES: Record<string, any>;
let B_FIXTURES: Record<string, any>;
let ACTIVE_USER: any = A_USER;

function addSyntheticTenantRows() {
  const d = db.data;
  const ts = now();
  const add = (key: keyof SeedData, row: any) => (d[key] as any[]).push(row);

  const makeTenant = (academy: string, prefix: string, profileId: string) => {
    const ids = {
      parent: `${prefix}-parent`, student: `${prefix}-student`, course: `${prefix}-course`, group: `${prefix}-group`,
      lesson: `${prefix}-lesson`, attendance: `${prefix}-attendance`, exam: `${prefix}-exam`, grade: `${prefix}-grade`,
      homework: `${prefix}-homework`, submission: `${prefix}-submission`, note: `${prefix}-note`, payment: `${prefix}-payment`,
      message: `${prefix}-message`, contentCourse: `${prefix}-content-course`, contentLesson: `${prefix}-content-lesson`, contentFile: `${prefix}-content-file`,
    };
    add("parents", { id: ids.parent, academy_id: academy, profile_id: profileId, first_name: prefix, last_name: "Parent", email: `${prefix}@test.invalid`, phone: null, occupation: null, created_at: ts, updated_at: ts });
    add("students", { id: ids.student, academy_id: academy, first_name: prefix, last_name: "Student", date_of_birth: null, gender: null, phone: null, email: `${prefix}.student@test.invalid`, parent_id: ids.parent, school: null, grade: null, notes: null, status: "ACTIVE", consent_given: true, consent_at: ts, consent_by: profileId, consent_version: "1.0", enrolled_at: ts, created_at: ts, updated_at: ts });
    add("courses", { id: ids.course, academy_id: academy, name: `${prefix} Course`, description: "Synthetic tenant fixture", color: "#000000", created_at: ts, updated_at: ts });
    add("groups", { id: ids.group, academy_id: academy, name: `${prefix} Group`, course_id: ids.course, teacher_id: academy === A ? "teacher-1" : "teacher-b", monthly_fee: 100, schedule: "Sat — 4:00 PM", room: null, status: "ACTIVE", created_at: ts, updated_at: ts });
    add("groupStudents", { group_id: ids.group, student_id: ids.student, joined_at: ts });
    add("lessons", { id: ids.lesson, academy_id: academy, group_id: ids.group, teacher_id: academy === A ? "teacher-1" : "teacher-b", date: "2099-01-10", start_time: "16:00", end_time: "17:00", topic: `${prefix} Lesson`, description: null, notes: null, created_at: ts, updated_at: ts });
    add("attendance", { id: ids.attendance, lesson_id: ids.lesson, student_id: ids.student, status: "PRESENT", note: null, recorded_at: ts });
    add("exams", { id: ids.exam, academy_id: academy, name: `${prefix} Exam`, course_id: ids.course, group_id: ids.group, date: "2099-01-10", max_score: 100, created_at: ts, updated_at: ts });
    add("grades", { id: ids.grade, exam_id: ids.exam, student_id: ids.student, score: 90, created_at: ts });
    add("homework", { id: ids.homework, academy_id: academy, group_id: ids.group, lesson_id: ids.lesson, title: `${prefix} Homework`, description: "Synthetic", deadline: "2099-01-20T12:00:00.000Z", attachment_url: null, created_at: ts });
    add("submissions", { id: ids.submission, homework_id: ids.homework, student_id: ids.student, content: null, file_url: null, status: "PENDING", submitted_at: null, reviewed_at: null, feedback: null, grade: null });
    add("notes", { id: ids.note, academy_id: academy, student_id: ids.student, author_id: profileId, content: `${prefix} note`, created_at: ts, updated_at: ts });
    add("payments", { id: ids.payment, academy_id: academy, student_id: ids.student, group_id: ids.group, amount: 100, currency: "EGP", status: "PAID", due_date: "2099-01-01", paid_at: ts, notes: null, created_at: ts, updated_at: ts });
    add("messages", { id: ids.message, academy_id: academy, sender_id: profileId, recipient_id: profileId, subject: `${prefix} message`, body: "Synthetic message", is_read: false, created_at: ts, updated_at: ts });
    add("contentCourses", { id: ids.contentCourse, academy_id: academy, teacher_id: academy === A ? "teacher-1" : "teacher-b", group_id: ids.group, title: `${prefix} Content Course`, description: "Synthetic", sort_order: 1, is_published: true, created_at: ts, updated_at: ts });
    add("contentLessons", { id: ids.contentLesson, academy_id: academy, course_id: ids.contentCourse, title: `${prefix} Content Lesson`, description: null, sort_order: 1, created_at: ts, updated_at: ts });
    add("contentFiles", { id: ids.contentFile, academy_id: academy, course_id: ids.contentCourse, lesson_id: ids.contentLesson, name: `${prefix}.pdf`, storage_path: `${prefix}/private.pdf`, file_url: `/api/content/files/${ids.contentFile}`, mime_type: "application/pdf", size_bytes: 10, created_at: ts });
    return { academy, profile: profileId, ...ids };
  };
  return { a: makeTenant(A, "A-SYNTH", A_USER.id), b: makeTenant(B, "B-SYNTH", B_USER.id) };
}

beforeEach(() => {
  db.data = createSeedData();
  const ids = addSyntheticTenantRows();
  A_FIXTURES = ids.a;
  B_FIXTURES = ids.b;
  useTenant(A);
});
afterEach(() => setRequestContext(null));

describe("Tenant isolation matrix — synthetic A/B service paths", () => {
  const readCases: Array<readonly [string, MatrixReader]> = [
    ["students", (id: string) => getStudent(id)],
    ["parents", async (id: string) => (await listParents()).find((x) => x.id === id) ?? null],
    ["groups", (id: string) => getGroup(id)],
    ["lessons", (id: string) => getLesson(id)],
    ["attendance", async (id: string) => { const s = id.startsWith("B-") ? B_FIXTURES.student : A_FIXTURES.student; return studentAttendanceSummary(s).byLesson.find((x: any) => x.id === id) ?? null; }],
    ["homework", (id: string) => getHomework(id)],
    ["grades", async (id: string) => (await listGrades({ examId: "ALL" })).items.find((x: any) => x.id === id) ?? null],
    ["notes", (id: string) => notesForStudent(id.startsWith("B-") ? B_FIXTURES.student : A_FIXTURES.student).find((x: any) => x.id === id) ?? null],
    ["payments", (id: string) => getPayment(id)],
    ["messages", async (id: string) => (await getInbox()).find((x: any) => x.id === id) ?? null],
    ["course content", (id: string) => getContentCourse(id, ACTIVE_USER)],
    ["private files", (id: string) => getContentFile(id, ACTIVE_USER)],
  ] as const;

  it("same-tenant GET: A→A and B→B both pass for every resource", async () => {
    for (const [resource, reader] of readCases) {
      useTenant(A);
      const a = await readOrNull(() => reader(A_FIXTURES[resourceKey(resource)]));
      expect(a, `${resource} A→A`).toBeTruthy();
      useTenant(B);
      const b = await readOrNull(() => reader(B_FIXTURES[resourceKey(resource)]));
      expect(b, `${resource} B→B`).toBeTruthy();
    }
  });

  it.each(readCases)("cross-tenant GET %s is denied in both directions", async (_resource, reader) => {
    const resource = _resource as string;
    useTenant(A);
    const a = await readOrNull(() => reader(B_FIXTURES[resourceKey(resource)]));
    expect(a, `${resource} A→B`).toBeFalsy();
    useTenant(B);
    const b = await readOrNull(() => reader(A_FIXTURES[resourceKey(resource)]));
    expect(b, `${resource} B→A`).toBeFalsy();
  });

  it("cross-tenant ID substitution is denied for every sensitive ID", async () => {
    const cases: Array<[string, () => Promise<unknown> | unknown, () => Promise<unknown> | unknown]> = [
      ["student", () => getStudent(B_FIXTURES.student), () => getStudent(A_FIXTURES.student)],
      ["parent", async () => (await listParents()).find((x) => x.id === B_FIXTURES.parent), async () => (await listParents()).find((x) => x.id === A_FIXTURES.parent)],
      ["group", () => getGroup(B_FIXTURES.group), () => getGroup(A_FIXTURES.group)],
      ["lesson", () => getLesson(B_FIXTURES.lesson), () => getLesson(A_FIXTURES.lesson)],
      ["homework", () => getHomework(B_FIXTURES.homework), () => getHomework(A_FIXTURES.homework)],
      ["exam", () => getExam(B_FIXTURES.exam), () => getExam(A_FIXTURES.exam)],
      ["payment", () => getPayment(B_FIXTURES.payment), () => getPayment(A_FIXTURES.payment)],
      ["content course", () => getContentCourse(B_FIXTURES.contentCourse, A_USER), () => getContentCourse(A_FIXTURES.contentCourse, B_USER)],
      ["content file", () => getContentFile(B_FIXTURES.contentFile, A_USER), () => getContentFile(A_FIXTURES.contentFile, B_USER)],
    ];
    for (const [name, aToB, bToA] of cases) {
      useTenant(A); expect(await aToB(), `${name} A→B`).toBeFalsy();
      useTenant(B); expect(await bToA(), `${name} B→A`).toBeFalsy();
    }
  });

  it("academy_id manipulation is rejected and never changes the snapshot", async () => {
    useTenant(A);
    await expectDeniedAndUnchanged(() => createStudent({ first_name: "Injected", last_name: "Student", academy_id: B } as any));
    await expectDeniedAndUnchanged(() => createGroup({ academy_id: B, name: "Injected", course_id: A_FIXTURES.course, teacher_id: "teacher-1", monthly_fee: 0, schedule: "Sat — 5:00 PM" } as any));
    await expectDeniedAndUnchanged(() => createCourse({ academy_id: B, name: "Injected Course" }));
    await expectDeniedAndUnchanged(() => createHomework({ academy_id: B, group_id: A_FIXTURES.group, title: "Injected", description: "", deadline: "2099-02-01T12:00:00.000Z" } as any));
  });

  it("cross-tenant CREATE is denied with no database change", async () => {
    const cases = (actor: string, ids: any): Array<readonly [string, MatrixOperation]> => [
      ["student", () => createStudent({ first_name: "Cross", last_name: "Student", groupIds: [ids.group] })],
      ["parent", () => createParent({ academy_id: ids.academy, profile_id: null, first_name: "Cross", last_name: "Parent", email: "cross@test.invalid", phone: null, occupation: null } as any)],
      ["group", () => createGroup({ name: "Cross", course_id: ids.course, teacher_id: actor === A ? "teacher-b" : "teacher-1", monthly_fee: 0, schedule: "Sat — 5:00 PM" })],
      ["lesson", () => createLesson({ group_id: ids.group, teacher_id: actor === A ? "teacher-b" : "teacher-1", date: "2099-02-01", start_time: "14:00", end_time: "15:00", topic: "Cross" })],
      ["attendance", () => saveAttendance(ids.lesson, [{ studentId: ids.student, status: "PRESENT" }])],
      ["homework", () => createHomework({ group_id: ids.group, lesson_id: ids.lesson, title: "Cross", description: "", deadline: "2099-02-01T12:00:00.000Z" } as any)],
      ["exam", () => createExam({ name: "Cross", course_id: ids.course, group_id: ids.group, date: "2099-02-01", max_score: 100 })],
      ["note", () => addNote(ids.student, "cross-author", "Cross Author", "Cross note")],
      ["payment", () => createPayment({ student_id: ids.student, group_id: ids.group, month: "2099-01", amount_due: 10, amount_paid: 0 })],
      ["message", () => sendMessage(ids.profile, "Cross message")],
      ["content", () => createContentCourse({ title: "Cross", description: "" } as any, actor === A ? A_USER : B_USER)],
    ];
    for (const actor of [A, B]) {
      useTenant(actor);
      const ids = actor === A ? B_FIXTURES : A_FIXTURES;
      for (const [resource, op] of cases(actor, ids)) await expectDeniedAndUnchanged(op).catch((e) => { throw new Error(`${resource} ${actor}→other: ${e.message}`); });
    }
  });

  it("cross-tenant UPDATE is denied with no database change", async () => {
    const cases = (ids: any, actor: string): Array<readonly [string, MatrixOperation]> => [
      ["student", () => updateStudent(ids.student, { notes: "cross" })],
      ["group", () => updateGroup(ids.group, { name: "cross" })],
      ["lesson", () => updateLesson(ids.lesson, { topic: "cross" })],
      ["attendance", () => saveAttendance(ids.lesson, [{ studentId: ids.student, status: "LATE" }])],
      ["homework", () => createHomework({ group_id: ids.group, lesson_id: ids.lesson, title: "cross", description: "", deadline: "2099-02-01T12:00:00.000Z" } as any)],
      ["exam", () => saveGrades(ids.exam, [{ studentId: ids.student, score: 1 }])],
      ["note", () => addNote(ids.student, "cross-author", "Cross Author", "cross")],
      ["payment", () => createPayment({ student_id: ids.student, group_id: ids.group, month: "2099-01", amount_due: 1, amount_paid: 0 })],
      ["content", () => createContentLesson({ course_id: ids.contentCourse, title: "cross", description: "", sort_order: 2 } as any, actor === A ? A_USER : B_USER)],
    ];
    for (const actor of [A, B]) {
      useTenant(actor);
      const ids = actor === A ? B_FIXTURES : A_FIXTURES;
      for (const [resource, op] of cases(ids, actor)) await expectDeniedAndUnchanged(op).catch((e) => { throw new Error(`${resource} ${actor}→other: ${e.message}`); });
    }
  });

  it("cross-tenant DELETE is denied and target records still exist", async () => {
    const cases = (ids: any): Array<readonly [string, MatrixOperation, MatrixOperation]> => [
      ["group", () => deleteGroup(ids.group), () => getGroup(ids.group)],
      ["lesson", () => deleteLesson(ids.lesson), () => getLesson(ids.lesson)],
      ["homework", () => deleteHomework(ids.homework), () => getHomework(ids.homework)],
      ["exam", () => deleteExam(ids.exam), () => getExam(ids.exam)],
      ["note", () => deleteNote(ids.note, ids.student), () => notesForStudent(ids.student).find((x: any) => x.id === ids.note)],
      ["payment", () => deletePayment(ids.payment), () => getPayment(ids.payment)],
    ];
    for (const actor of [A, B]) {
      useTenant(actor);
      const ids = actor === A ? B_FIXTURES : A_FIXTURES;
      for (const [resource, del, verify] of cases(ids)) {
        await expectDeniedAndUnchanged(del).catch((e) => { throw new Error(`${resource} ${actor}→other: ${e.message}`); });
        useTenant(actor === A ? B : A);
        expect(await verify(), `${resource} target retained`).toBeTruthy();
        useTenant(actor);
      }
    }
  });

  it("content and private-file paths never expose another tenant's URL or metadata", async () => {
    useTenant(A);
    expect(await getContentCourse(B_FIXTURES.contentCourse, A_USER)).toBeNull();
    expect(await getContentFile(B_FIXTURES.contentFile, A_USER)).toBeNull();
    expect(await listContentFiles(B_FIXTURES.contentCourse, A_USER)).toEqual([]);
    useTenant(B);
    expect(await getContentCourse(A_FIXTURES.contentCourse, B_USER)).toBeNull();
    expect(await getContentFile(A_FIXTURES.contentFile, B_USER)).toBeNull();
    expect(await listContentFiles(A_FIXTURES.contentCourse, B_USER)).toEqual([]);
  });
});

async function readOrNull(reader: () => Promise<unknown> | unknown): Promise<unknown | null> {
  try { return await reader(); } catch { return null; }
}

function resourceKey(resource: string): string {
  const map: Record<string, string> = {
    students: "student", parents: "parent", groups: "group", lessons: "lesson", attendance: "attendance",
    homework: "homework", grades: "grade", notes: "note", payments: "payment", messages: "message",
    "course content": "contentCourse", "private files": "contentFile",
  };
  return map[resource] ?? resource;
}
