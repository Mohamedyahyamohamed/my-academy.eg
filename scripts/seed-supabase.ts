/**
 * Supabase seed script — creates real auth users + full demo dataset.
 * Uses the service role key (bypasses RLS). Run after supabase/schema.sql.
 *
 *   SUPABASE_URL=... SERVICE_ROLE_KEY=... npx tsx scripts/seed-supabase.ts
 */
import { WebSocket as WS } from "ws";
(globalThis as any).WebSocket = (globalThis as any).WebSocket || WS;
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "demo1234";
const now = () => new Date().toISOString();
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
};
const daysFromNow = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
};
const monthsAgo = (n: number) => {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString();
};
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dateOnly = (s: string) => s.slice(0, 10);

async function ins(table: string, rows: any | any[]) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return data!;
}

async function main() {
  console.log("→ academy");
  const { data: academyData, error: academyErr } = await supabase
    .from("academies")
    .upsert(
      {
        name: "MY Academy", slug: "my-academy", currency: "EGP", timezone: "Africa/Cairo",
        email: "hello@myacademy.edu", country: "Egypt", phone: "+20 100 000 0000",
        created_at: monthsAgo(10), updated_at: now(),
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (academyErr) throw new Error(`upsert academies: ${academyErr.message}`);
  const academyId = academyData!.id;

  // Auth users (handle_new_user trigger auto-creates a profile)
  const accounts = [
    { email: "admin@myacademy.edu", role: "ADMIN", full_name: "Yasmin Hassan", phone: "+20 100 111 1111" },
    { email: "teacher@myacademy.edu", role: "TEACHER", full_name: "Omar Khaled", phone: "+20 100 222 2222" },
    { email: "parent@myacademy.edu", role: "PARENT", full_name: "Mariam Adel", phone: "+20 100 333 3333" },
    { email: "student@myacademy.edu", role: "STUDENT", full_name: "Adam Tarek", phone: "+20 100 444 4444" },
  ];
  const profileIdByEmail: Record<string, string> = {};
  for (const a of accounts) {
    let uid: string | undefined;
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email, password: DEMO_PASSWORD, email_confirm: true,
      user_metadata: { full_name: a.full_name, role: a.role },
    });
    if (error) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const u = list?.users?.find((x) => x.email === a.email);
      if (!u) throw error;
      uid = u.id;
    } else {
      uid = data.user.id;
    }
    profileIdByEmail[a.email] = uid!;
    await supabase.from("profiles").upsert({
      id: uid, academy_id: academyId, email: a.email, role: a.role,
      full_name: a.full_name, phone: a.phone, is_active: true,
    });
    console.log("  ✓ user", a.email);
  }

  console.log("→ courses");
  const courseId: Record<string, string> = {};
  const courses = [
    { name: "Mathematics", color: "#7c5cfc", description: "Algebra, geometry & calculus fundamentals." },
    { name: "Physics", color: "#0ea5e9", description: "Mechanics, electricity & modern physics." },
    { name: "Chemistry", color: "#10b981", description: "Organic & inorganic chemistry." },
    { name: "English", color: "#f59e0b", description: "Grammar, writing & conversation." },
  ];
  for (const c of courses) {
    const [row] = await ins("courses", { academy_id: academyId, ...c, created_at: monthsAgo(10), updated_at: now() });
    courseId[c.name] = row.id;
  }

  console.log("→ teachers");
  const teacherId: Record<string, string> = {};
  const teachers = [
    { key: "Omar Khaled", first_name: "Omar", last_name: "Khaled", email: "teacher@myacademy.edu", profile_id: profileIdByEmail["teacher@myacademy.edu"] },
    { key: "Laila Mostafa", first_name: "Laila", last_name: "Mostafa", email: "laila@myacademy.edu", profile_id: null },
  ];
  for (const t of teachers) {
    const [row] = await ins("teachers", { academy_id: academyId, profile_id: t.profile_id, first_name: t.first_name, last_name: t.last_name, email: t.email, phone: null, bio: null, is_active: true, created_at: monthsAgo(9), updated_at: now() });
    teacherId[t.key] = row.id;
  }

  console.log("→ parents");
  const parentId: Record<string, string> = {};
  const parents = [
    { key: "Mariam Adel", first_name: "Mariam", last_name: "Adel", email: "parent@myacademy.edu", profile_id: profileIdByEmail["parent@myacademy.edu"], occupation: "Engineer" },
    { key: "Khaled Sami", first_name: "Khaled", last_name: "Sami", email: "khaled.sami@example.com", profile_id: null, occupation: "Doctor" },
    { key: "Nour Fathy", first_name: "Nour", last_name: "Fathy", email: "nour.fathy@example.com", profile_id: null, occupation: "Accountant" },
  ];
  for (const p of parents) {
    const [row] = await ins("parents", { academy_id: academyId, profile_id: p.profile_id, first_name: p.first_name, last_name: p.last_name, email: p.email, phone: null, occupation: p.occupation, created_at: monthsAgo(8), updated_at: now() });
    parentId[p.key] = row.id;
  }

  console.log("→ students");
  const studentId: Record<string, string> = {};
  const students = [
    { key: "Adam Tarek", first_name: "Adam", last_name: "Tarek", parent: "Mariam Adel", grade: "Grade 9", school: "Future International", email: "student@myacademy.edu", status: "ACTIVE" },
    { key: "Salma Youssef", first_name: "Salma", last_name: "Youssef", parent: "Mariam Adel", grade: "Grade 9", school: "Future International", email: null, status: "ACTIVE" },
    { key: "Youssef Khaled", first_name: "Youssef", last_name: "Khaled", parent: "Khaled Sami", grade: "Grade 10", school: "Nile Valley", email: null, status: "ACTIVE" },
    { key: "Habiba Sami", first_name: "Habiba", last_name: "Sami", parent: "Khaled Sami", grade: "Grade 10", school: "Nile Valley", email: null, status: "ACTIVE" },
    { key: "Ziad Maged", first_name: "Ziad", last_name: "Maged", parent: "Nour Fathy", grade: "Grade 11", school: "Cairo English", email: null, status: "ACTIVE" },
    { key: "Mai Fathy", first_name: "Mai", last_name: "Fathy", parent: "Nour Fathy", grade: "Grade 11", school: "Cairo English", email: null, status: "ACTIVE" },
    { key: "Karim Amr", first_name: "Karim", last_name: "Amr", parent: null, grade: "Grade 9", school: "Future International", email: null, status: "ACTIVE" },
    { key: "Farida Nabil", first_name: "Farida", last_name: "Nabil", parent: null, grade: "Grade 10", school: "Nile Valley", email: null, status: "ACTIVE" },
  ];
  for (const s of students) {
    const [row] = await ins("students", {
      academy_id: academyId, first_name: s.first_name, last_name: s.last_name,
      parent_id: s.parent ? parentId[s.parent] : null, grade: s.grade, school: s.school,
      email: s.email, status: s.status, enrolled_at: monthsAgo(7), created_at: monthsAgo(7), updated_at: now(),
    });
    studentId[s.key] = row.id;
  }

  console.log("→ groups");
  const groupId: Record<string, string> = {};
  const groupFee: Record<string, number> = {};
  const groups = [
    { key: "Grade 9 — Math A", name: "Grade 9 — Math A", course: "Mathematics", teacher: "Omar Khaled", fee: 1200, schedule: "Sun, Tue, Thu — 4:00 PM", room: "Room 101" },
    { key: "Grade 10 — Physics", name: "Grade 10 — Physics", course: "Physics", teacher: "Omar Khaled", fee: 1400, schedule: "Mon, Wed — 5:30 PM", room: "Lab A" },
    { key: "Grade 11 — Chemistry", name: "Grade 11 — Chemistry", course: "Chemistry", teacher: "Omar Khaled", fee: 1500, schedule: "Sat, Mon — 6:00 PM", room: "Lab B" },
    { key: "English Conversation", name: "English Conversation", course: "English", teacher: "Laila Mostafa", fee: 1000, schedule: "Fri — 11:00 AM", room: "Room 202" },
  ];
  for (const g of groups) {
    const [row] = await ins("groups", { academy_id: academyId, name: g.name, course_id: courseId[g.course], teacher_id: teacherId[g.teacher], monthly_fee: g.fee, schedule: g.schedule, room: g.room, status: "ACTIVE", created_at: monthsAgo(7), updated_at: now() });
    groupId[g.key] = row.id; groupFee[g.key] = g.fee;
  }

  // Enrollments
  const enroll: [string, string][] = [
    ["Grade 9 — Math A", "Adam Tarek"], ["Grade 9 — Math A", "Salma Youssef"], ["Grade 9 — Math A", "Karim Amr"],
    ["Grade 10 — Physics", "Youssef Khaled"], ["Grade 10 — Physics", "Habiba Sami"], ["Grade 10 — Physics", "Farida Nabil"],
    ["Grade 11 — Chemistry", "Ziad Maged"], ["Grade 11 — Chemistry", "Mai Fathy"],
    ["English Conversation", "Salma Youssef"], ["English Conversation", "Karim Amr"], ["English Conversation", "Farida Nabil"],
  ];
  const rosterByGroup: Record<string, string[]> = {};
  const enrollRows = enroll.map(([g, s]) => {
    (rosterByGroup[g] ??= []).push(studentId[s]);
    return { group_id: groupId[g], student_id: studentId[s], joined_at: monthsAgo(6) };
  });
  await ins("group_students", enrollRows);
  console.log("→ enrollments", enrollRows.length);

  // Lessons
  console.log("→ lessons");
  const lessonId: string[] = [];
  const pastLessons: [string, string, number][] = [
    ["Grade 9 — Math A", "Linear Equations", 18], ["Grade 9 — Math A", "Quadratic Functions", 16],
    ["Grade 9 — Math A", "Geometry Basics", 14], ["Grade 10 — Physics", "Newton's Laws", 16],
    ["Grade 10 — Physics", "Projectile Motion", 14], ["Grade 11 — Chemistry", "Atomic Structure", 14],
    ["Grade 11 — Chemistry", "Chemical Bonding", 12], ["English Conversation", "Describing People", 12],
  ];
  for (const [g, topic, d] of pastLessons) {
    const [row] = await ins("lessons", { academy_id: academyId, group_id: groupId[g], teacher_id: teacherId["Omar Khaled"], date: dateOnly(daysAgo(d)), start_time: "16:00", end_time: "17:30", topic, created_at: daysAgo(d + 1), updated_at: daysAgo(d) });
    lessonId.push(row.id);
  }
  const upcoming: [string, string, number][] = [
    ["Grade 9 — Math A", "Systems of Equations", 2], ["Grade 10 — Physics", "Energy & Work", 4],
    ["Grade 11 — Chemistry", "Acids & Bases", 6], ["English Conversation", "Storytelling", 8],
  ];
  for (const [g, topic, d] of upcoming) {
    const [row] = await ins("lessons", { academy_id: academyId, group_id: groupId[g], teacher_id: teacherId["Omar Khaled"], date: dateOnly(daysFromNow(d)), start_time: "16:00", end_time: "17:30", topic, created_at: now(), updated_at: now() });
    lessonId.push(row.id);
  }

  // Attendance for past lessons
  console.log("→ attendance");
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT"] as const;
  const attRows: any[] = [];
  pastLessons.forEach(([g], li) => {
    const lid = lessonId[li];
    (rosterByGroup[g] ?? []).forEach((sid, i) => {
      attRows.push({ lesson_id: lid, student_id: sid, status: statuses[(i + li) % statuses.length], recorded_at: daysAgo(18 - li * 2) });
    });
  });
  if (attRows.length) await ins("attendance", attRows);

  // Payments (4 months per enrollment)
  console.log("→ payments");
  const payRows: any[] = [];
  for (let m = 3; m >= 0; m--) {
    const d = new Date(); d.setMonth(d.getMonth() - m);
    const mk = monthKey(d);
    enroll.forEach(([g, s], idx) => {
      const due = groupFee[g];
      const seedN = (idx * 4 + m) % 5;
      let paid = due;
      if (seedN === 3) paid = Math.round(due * 0.5);
      else if (seedN === 4 && m >= 1) paid = 0;
      payRows.push({
        academy_id: academyId, student_id: studentId[s], group_id: groupId[g], month: mk,
        amount_due: due, amount_paid: paid,
        due_date: dateOnly(new Date(d.getFullYear(), d.getMonth() + 1, 5).toISOString()),
        payment_date: paid > 0 ? new Date(d.getFullYear(), d.getMonth(), 8).toISOString() : null,
        method: paid > 0 ? "Cash" : null,
        status: paid >= due ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        created_at: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(), updated_at: now(),
      });
    });
  }
  await ins("payments", payRows);

  // Exams + grades
  console.log("→ exams + grades");
  const exams = [
    { name: "Algebra Midterm", group: "Grade 9 — Math A", course: "Mathematics", max: 50, d: 14, scores: [48, 41, 30] },
    { name: "Physics Quiz 1", group: "Grade 10 — Physics", course: "Physics", max: 30, d: 10, scores: [27, 23, 19] },
    { name: "Chemistry Test 1", group: "Grade 11 — Chemistry", course: "Chemistry", max: 40, d: 7, scores: [38, 30] },
  ];
  const gradeRows: any[] = [];
  for (const e of exams) {
    const [exam] = await ins("exams", { academy_id: academyId, name: e.name, course_id: courseId[e.course], group_id: groupId[e.group], date: dateOnly(daysAgo(e.d)), max_score: e.max, created_at: daysAgo(e.d), updated_at: daysAgo(e.d) });
    (rosterByGroup[e.group] ?? []).forEach((sid, i) => {
      gradeRows.push({ exam_id: exam.id, student_id: sid, score: e.scores[i % e.scores.length], created_at: daysAgo(e.d) });
    });
  }
  if (gradeRows.length) await ins("grades", gradeRows);

  // Homework + submissions
  console.log("→ homework");
  const hwItems = [
    { title: "Quadratics Worksheet", group: "Grade 9 — Math A", desc: "Solve problems 1–12 on graphing quadratics.", due: 3 },
    { title: "Projectile Problems", group: "Grade 10 — Physics", desc: "Complete the kinematics worksheet.", due: 2 },
    { title: "Geometry Proof Set", group: "Grade 9 — Math A", desc: "Write proofs for the 5 given statements.", due: -2 },
  ];
  const subRows: any[] = [];
  for (const h of hwItems) {
    const [hw] = await ins("homework", { academy_id: academyId, group_id: groupId[h.group], lesson_id: null, title: h.title, description: h.desc, deadline: daysFromNow(h.due), created_at: daysAgo(4) });
    (rosterByGroup[h.group] ?? []).forEach((sid, i) => {
      const overdue = h.due < 0;
      let status: any = "PENDING";
      if (overdue && i % 3 !== 0) status = "REVIEWED";
      else if (i % 2 === 0) status = "SUBMITTED";
      subRows.push({
        homework_id: hw.id, student_id: sid,
        content: status !== "PENDING" ? "Completed all problems." : null,
        status, submitted_at: status !== "PENDING" ? daysAgo(2) : null,
        reviewed_at: status === "REVIEWED" ? daysAgo(1) : null,
        feedback: status === "REVIEWED" ? "Good work, watch sign errors." : null,
        grade: status === "REVIEWED" ? 9 - (i % 2) : null,
      });
    });
  }
  if (subRows.length) await ins("homework_submissions", subRows);

  // Notifications
  console.log("→ notifications");
  await ins("notifications", [
    { academy_id: academyId, user_id: profileIdByEmail["admin@myacademy.edu"], type: "payment_overdue", title: "Overdue payment", message: "A student has an overdue payment this month.", link: "/payments", read: false, created_at: daysAgo(1) },
    { academy_id: academyId, user_id: profileIdByEmail["parent@myacademy.edu"], type: "new_grade", title: "New grade for Adam", message: "Adam scored 48/50 on Algebra Midterm.", link: "/grades", read: false, created_at: daysAgo(3) },
    { academy_id: academyId, user_id: profileIdByEmail["parent@myacademy.edu"], type: "homework_deadline", title: "Homework due soon", message: "Quadratics Worksheet is due in 3 days.", link: "/homework", read: false, created_at: daysAgo(1) },
  ]);

  console.log("\n✅ Seed complete. Login password:", DEMO_PASSWORD);
}

main().catch((e) => { console.error("✗", e); process.exit(1); });
