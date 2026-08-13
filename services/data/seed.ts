/**
 * Development seed dataset for MY Academy.
 * Generates realistic, interconnected data with dates relative to "now",
 * so dashboards always show fresh, non-hardcoded values.
 *
 * NOTE: This is development data only. In production the Supabase adapter
 * is used (see services/supabase) and this file is not loaded.
 */
import type {
  Academy,
  AppNotification,
  AttendanceRecord,
  Course,
  Exam,
  FileRecord,
  Grade,
  Group,
  Homework,
  HomeworkSubmission,
  Lesson,
  Note,
  Parent,
  Payment,
  PaymentTransaction,
  Profile,
  Student,
  Teacher,
} from "@/types";

export interface SeedData {
  academies: Academy[];
  profiles: Profile[];
  courses: Course[];
  teachers: Teacher[];
  parents: Parent[];
  students: Student[];
  groups: Group[];
  groupStudents: { group_id: string; student_id: string; joined_at: string }[];
  groupAssistants: { group_id: string; teacher_id: string; assigned_at: string }[];
  lessons: Lesson[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  transactions: PaymentTransaction[];
  exams: Exam[];
  grades: Grade[];
  homework: Homework[];
  submissions: HomeworkSubmission[];
  notifications: AppNotification[];
  notes: Note[];
  files: FileRecord[];
  /** رسائل محمّلة من قاعدة البيانات ومزودة بأسماء العرض في طبقة الخدمة. */
  messages: any[];
  auditLogs: any[];
  subscriptions: Array<{
    id: string;
    academy_id: string;
    plan_id: string;
    status: string;
    [key: string]: unknown;
  }>;
}

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};
const atTime = (d: Date, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
};
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function createSeedData(): SeedData {
  const academyId = "academy-1";
  const now = new Date();

  const academy: Academy = {
    id: academyId,
    name: "MY Academy",
    slug: "my-academy",
    logo_url: null,
    country: "Egypt",
    currency: "EGP",
    timezone: "Africa/Cairo",
    phone: "+20 100 000 0000",
    email: "hello@myacademy.edu",
    address: "Cairo, Egypt",
    created_at: iso(monthsAgo(10)),
    updated_at: iso(now),
  };

  // ---- Profiles (auth users) ----
  const profiles: Profile[] = [
    {
      id: "prof-admin",
      academy_id: academyId,
      email: "admin@myacademy.edu",
      role: "ADMIN",
      full_name: "Yasmin Hassan",
      phone: "+20 100 111 1111",
      avatar_url: null,
      is_active: true,
      created_at: iso(monthsAgo(10)),
      updated_at: iso(now),
    },
    {
      id: "prof-teacher",
      academy_id: academyId,
      email: "teacher@myacademy.edu",
      role: "TEACHER",
      full_name: "Omar Khaled",
      phone: "+20 100 222 2222",
      avatar_url: null,
      is_active: true,
      created_at: iso(monthsAgo(9)),
      updated_at: iso(now),
    },
    {
      id: "prof-parent",
      academy_id: academyId,
      email: "parent@myacademy.edu",
      role: "PARENT",
      full_name: "Mariam Adel",
      phone: "+20 100 333 3333",
      avatar_url: null,
      is_active: true,
      created_at: iso(monthsAgo(8)),
      updated_at: iso(now),
    },
    {
      id: "prof-student",
      academy_id: academyId,
      email: "student@myacademy.edu",
      role: "STUDENT",
      full_name: "Adam Tarek",
      phone: "+20 100 444 4444",
      avatar_url: null,
      is_active: true,
      created_at: iso(monthsAgo(7)),
      updated_at: iso(now),
    },
  ];

  // ---- Courses ----
  const courses: Course[] = [
    {
      id: "course-math",
      academy_id: academyId,
      name: "Mathematics",
      description: "Algebra, geometry & calculus fundamentals.",
      color: "#7c5cfc",
      created_at: iso(monthsAgo(10)),
      updated_at: iso(now),
    },
    {
      id: "course-physics",
      academy_id: academyId,
      name: "Physics",
      description: "Mechanics, electricity & modern physics.",
      color: "#0ea5e9",
      created_at: iso(monthsAgo(10)),
      updated_at: iso(now),
    },
    {
      id: "course-chem",
      academy_id: academyId,
      name: "Chemistry",
      description: "Organic & inorganic chemistry.",
      color: "#10b981",
      created_at: iso(monthsAgo(9)),
      updated_at: iso(now),
    },
    {
      id: "course-eng",
      academy_id: academyId,
      name: "English",
      description: "Grammar, writing & conversation.",
      color: "#f59e0b",
      created_at: iso(monthsAgo(9)),
      updated_at: iso(now),
    },
  ];

  // ---- Teachers ----
  const teachers: Teacher[] = [
    {
      id: "teacher-1",
      academy_id: academyId,
      profile_id: "prof-teacher",
      first_name: "Omar",
      last_name: "Khaled",
      email: "teacher@myacademy.edu",
      phone: "+20 100 222 2222",
      bio: "Physics & Mathematics specialist with 8 years of experience.",
      is_active: true,
      created_at: iso(monthsAgo(9)),
      updated_at: iso(now),
    },
    {
      id: "teacher-2",
      academy_id: academyId,
      profile_id: null,
      first_name: "Laila",
      last_name: "Mostafa",
      email: "laila@myacademy.edu",
      phone: "+20 100 555 5555",
      bio: "English & language arts teacher.",
      is_active: true,
      created_at: iso(monthsAgo(8)),
      updated_at: iso(now),
    },
  ];

  // ---- Parents ----
  const parents: Parent[] = [
    {
      id: "parent-1",
      academy_id: academyId,
      profile_id: "prof-parent",
      first_name: "Mariam",
      last_name: "Adel",
      email: "parent@myacademy.edu",
      phone: "+20 100 333 3333",
      occupation: "Engineer",
      created_at: iso(monthsAgo(8)),
      updated_at: iso(now),
    },
    {
      id: "parent-2",
      academy_id: academyId,
      profile_id: null,
      first_name: "Khaled",
      last_name: "Sami",
      email: "khaled.sami@example.com",
      phone: "+20 101 666 6666",
      occupation: "Doctor",
      created_at: iso(monthsAgo(7)),
      updated_at: iso(now),
    },
    {
      id: "parent-3",
      academy_id: academyId,
      profile_id: null,
      first_name: "Nour",
      last_name: "Fathy",
      email: "nour.fathy@example.com",
      phone: "+20 102 777 7777",
      occupation: "Accountant",
      created_at: iso(monthsAgo(6)),
      updated_at: iso(now),
    },
  ];

  // ---- Students ----
  const rawStudents: Array<
    Omit<Student, "academy_id" | "created_at" | "updated_at" | "enrolled_at">
  > = [
    { id: "student-1", first_name: "Adam", last_name: "Tarek", date_of_birth: iso(daysAgo(365 * 14)), gender: "male", phone: null, email: "student@myacademy.edu", parent_id: "parent-1", school: "Future International", grade: "Grade 9", notes: "Strong in algebra, needs help with geometry.", status: "ACTIVE" },
    { id: "student-2", first_name: "Salma", last_name: "Youssef", date_of_birth: iso(daysAgo(365 * 15)), gender: "female", phone: null, email: null, parent_id: "parent-1", school: "Future International", grade: "Grade 9", notes: null, status: "ACTIVE" },
    { id: "student-3", first_name: "Youssef", last_name: "Khaled", date_of_birth: iso(daysAgo(365 * 16)), gender: "male", phone: null, email: null, parent_id: "parent-2", school: "Nile Valley", grade: "Grade 10", notes: "Excellent participation.", status: "ACTIVE" },
    { id: "student-4", first_name: "Habiba", last_name: "Sami", date_of_birth: iso(daysAgo(365 * 15)), gender: "female", phone: null, email: null, parent_id: "parent-2", school: "Nile Valley", grade: "Grade 10", notes: null, status: "ACTIVE" },
    { id: "student-5", first_name: "Ziad", last_name: "Maged", date_of_birth: iso(daysAgo(365 * 17)), gender: "male", phone: null, email: null, parent_id: "parent-3", school: "Cairo English", grade: "Grade 11", notes: "Often late to morning sessions.", status: "ACTIVE" },
    { id: "student-6", first_name: "Mai", last_name: "Fathy", date_of_birth: iso(daysAgo(365 * 16)), gender: "female", phone: null, email: null, parent_id: "parent-3", school: "Cairo English", grade: "Grade 11", notes: null, status: "ACTIVE" },
    { id: "student-7", first_name: "Karim", last_name: "Amr", date_of_birth: iso(daysAgo(365 * 14)), gender: "male", phone: null, email: null, parent_id: null, school: "Future International", grade: "Grade 9", notes: "No parent linked yet.", status: "ACTIVE" },
    { id: "student-8", first_name: "Farida", last_name: "Nabil", date_of_birth: iso(daysAgo(365 * 15)), gender: "female", phone: "+20 103 888 8888", email: null, parent_id: null, school: "Nile Valley", grade: "Grade 10", notes: null, status: "ACTIVE" },
    { id: "student-9", first_name: "Ahmed", last_name: "Reda", date_of_birth: iso(daysAgo(365 * 17)), gender: "male", phone: null, email: null, parent_id: null, school: "Cairo English", grade: "Grade 11", notes: "Inconsistent attendance.", status: "INACTIVE" },
    { id: "student-10", first_name: "Laila", last_name: "Hany", date_of_birth: iso(daysAgo(365 * 14)), gender: "female", phone: null, email: null, parent_id: null, school: "Future International", grade: "Grade 9", notes: null, status: "ARCHIVED" },
  ];

  const students: Student[] = rawStudents.map((s, i) => {
    return {
      ...s,
      academy_id: academyId,
      enrolled_at: iso(monthsAgo(7 - (i % 4))),
      created_at: iso(monthsAgo(7 - (i % 4))),
      updated_at: iso(now),
    };
  });

  // ---- Groups ----
  const groups: Group[] = [
    {
      id: "group-1",
      academy_id: academyId,
      name: "Grade 9 — Math A",
      course_id: "course-math",
      teacher_id: "teacher-1",
      monthly_fee: 1200,
      schedule: "Sun, Tue, Thu — 4:00 PM",
      room: "Room 101",
      status: "ACTIVE",
      created_at: iso(monthsAgo(7)),
      updated_at: iso(now),
    },
    {
      id: "group-2",
      academy_id: academyId,
      name: "Grade 10 — Physics",
      course_id: "course-physics",
      teacher_id: "teacher-1",
      monthly_fee: 1400,
      schedule: "Mon, Wed — 5:30 PM",
      room: "Lab A",
      status: "ACTIVE",
      created_at: iso(monthsAgo(7)),
      updated_at: iso(now),
    },
    {
      id: "group-3",
      academy_id: academyId,
      name: "Grade 11 — Chemistry",
      course_id: "course-chem",
      teacher_id: "teacher-1",
      monthly_fee: 1500,
      schedule: "Sat, Mon — 6:00 PM",
      room: "Lab B",
      status: "ACTIVE",
      created_at: iso(monthsAgo(6)),
      updated_at: iso(now),
    },
    {
      id: "group-4",
      academy_id: academyId,
      name: "English Conversation",
      course_id: "course-eng",
      teacher_id: "teacher-2",
      monthly_fee: 1000,
      schedule: "Fri — 11:00 AM",
      room: "Room 202",
      status: "ACTIVE",
      created_at: iso(monthsAgo(5)),
      updated_at: iso(now),
    },
  ];

  // ---- Enrollments ----
  const groupStudents = [
    { group_id: "group-1", student_id: "student-1", joined_at: iso(monthsAgo(7)) },
    { group_id: "group-1", student_id: "student-2", joined_at: iso(monthsAgo(7)) },
    { group_id: "group-1", student_id: "student-7", joined_at: iso(monthsAgo(6)) },
    { group_id: "group-2", student_id: "student-3", joined_at: iso(monthsAgo(7)) },
    { group_id: "group-2", student_id: "student-4", joined_at: iso(monthsAgo(7)) },
    { group_id: "group-2", student_id: "student-8", joined_at: iso(monthsAgo(5)) },
    { group_id: "group-3", student_id: "student-5", joined_at: iso(monthsAgo(6)) },
    { group_id: "group-3", student_id: "student-6", joined_at: iso(monthsAgo(6)) },
    { group_id: "group-4", student_id: "student-2", joined_at: iso(monthsAgo(5)) },
    { group_id: "group-4", student_id: "student-7", joined_at: iso(monthsAgo(5)) },
    { group_id: "group-4", student_id: "student-8", joined_at: iso(monthsAgo(4)) },
  ];

  // ---- Lessons (8 past + 4 upcoming) ----
  const lessons: Lesson[] = [];
  const lessonMeta: Array<{
    group_id: string;
    topic: string;
    desc: string;
  }> = [
    { group_id: "group-1", topic: "Linear Equations", desc: "Solving one and two-step equations." },
    { group_id: "group-1", topic: "Quadratic Functions", desc: "Graphing parabolas and roots." },
    { group_id: "group-1", topic: "Geometry Basics", desc: "Angles, triangles and proof." },
    { group_id: "group-2", topic: "Newton's Laws", desc: "Forces and motion." },
    { group_id: "group-2", topic: "Projectile Motion", desc: "2D kinematics." },
    { group_id: "group-3", topic: "Atomic Structure", desc: "Electrons, protons & isotopes." },
    { group_id: "group-3", topic: "Chemical Bonding", desc: "Ionic vs covalent bonds." },
    { group_id: "group-4", topic: "Describing People", desc: "Adjectives & personality vocab." },
  ];
  lessonMeta.forEach((m, i) => {
    const g = groups.find((g) => g.id === m.group_id)!;
    lessons.push({
      id: `lesson-${i + 1}`,
      academy_id: academyId,
      group_id: m.group_id,
      teacher_id: g.teacher_id,
      date: iso(daysAgo((8 - i) * 2)),
      start_time: "16:00",
      end_time: "17:30",
      topic: m.topic,
      description: m.desc,
      notes: null,
      created_at: iso(daysAgo((8 - i) * 2 + 1)),
      updated_at: iso(daysAgo((8 - i) * 2)),
    });
  });
  // Upcoming lessons
  const upcomingMeta = [
    { group_id: "group-1", topic: "Systems of Equations", start: "16:00", end: "17:30" },
    { group_id: "group-2", topic: "Energy & Work", start: "17:30", end: "19:00" },
    { group_id: "group-3", topic: "Acids & Bases", start: "18:00", end: "19:30" },
    { group_id: "group-4", topic: "Storytelling", start: "11:00", end: "12:30" },
  ];
  upcomingMeta.forEach((m, i) => {
    const g = groups.find((g) => g.id === m.group_id)!;
    lessons.push({
      id: `lesson-up-${i + 1}`,
      academy_id: academyId,
      group_id: m.group_id,
      teacher_id: g.teacher_id,
      date: iso(daysFromNow((i + 1) * 2)),
      start_time: m.start,
      end_time: m.end,
      topic: m.topic,
      description: "Upcoming session.",
      notes: null,
      created_at: iso(now),
      updated_at: iso(now),
    });
  });

  // ---- Attendance (for past lessons) ----
  const attendance: AttendanceRecord[] = [];
  const pastLessons = lessons.filter(
    (l) => new Date(l.date).getTime() < now.getTime(),
  );
  const statuses: AttendanceRecord["status"][] = [
    "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT",
  ];
  pastLessons.forEach((lesson) => {
    const enrolled = groupStudents.filter((gs) => gs.group_id === lesson.group_id);
    enrolled.forEach((gs, idx) => {
      attendance.push({
        id: `att-${lesson.id}-${gs.student_id}`,
        lesson_id: lesson.id,
        student_id: gs.student_id,
        status: statuses[(idx + lesson.id.length) % statuses.length],
        note: null,
        recorded_at: lesson.date,
      });
    });
  });

  // ---- Payments (last 4 months per enrollment) ----
  const payments: Payment[] = [];
  const transactions: PaymentTransaction[] = [];
  const months = [3, 2, 1, 0].map((m) => {
    const d = monthsAgo(m);
    return { key: monthKey(d), label: d, due: iso(new Date(d.getFullYear(), d.getMonth() + 1, 5)) };
  });

  groupStudents.forEach((gs, gi) => {
    const group = groups.find((g) => g.id === gs.group_id)!;
    const fee = group.monthly_fee;
    months.forEach((m, mi) => {
      // Vary payment behavior per student/month for realism
      const seedN = (gi * 4 + mi) % 5;
      let amountPaid = fee;
      let status: Payment["status"] = "PAID";
      let paymentDate: string | null = iso(
        new Date(new Date(m.label).getFullYear(), new Date(m.label).getMonth(), 8),
      );
      if (seedN === 3) {
        amountPaid = Math.round(fee * 0.5);
        status = "PARTIAL";
      } else if (seedN === 4 && mi >= 1) {
        amountPaid = 0;
        status = "UNPAID";
        paymentDate = null;
      }
      const remaining = fee - amountPaid;
      const payId = `pay-${gs.group_id}-${gs.student_id}-${m.key}`;
      payments.push({
        id: payId,
        academy_id: academyId,
        student_id: gs.student_id,
        group_id: gs.group_id,
        month: m.key,
        amount_due: fee,
        amount_paid: amountPaid,
        remaining,
        due_date: m.due,
        payment_date: paymentDate,
        method: amountPaid > 0 ? "Cash" : null,
        status,
        notes: null,
        created_at: iso(new Date(new Date(m.label).getFullYear(), new Date(m.label).getMonth(), 1)),
        updated_at: iso(now),
      });
      if (amountPaid > 0) {
        transactions.push({
          id: `tx-${payId}`,
          payment_id: payId,
          amount: amountPaid,
          method: "Cash",
          paid_at: paymentDate!,
          note: null,
        });
      }
    });
  });

  // ---- Exams & Grades ----
  const exams: Exam[] = [
    {
      id: "exam-1",
      academy_id: academyId,
      name: "Algebra Midterm",
      course_id: "course-math",
      group_id: "group-1",
      date: iso(daysAgo(14)),
      max_score: 50,
      created_at: iso(daysAgo(14)),
      updated_at: iso(daysAgo(14)),
    },
    {
      id: "exam-2",
      academy_id: academyId,
      name: "Physics Quiz 1",
      course_id: "course-physics",
      group_id: "group-2",
      date: iso(daysAgo(10)),
      max_score: 30,
      created_at: iso(daysAgo(10)),
      updated_at: iso(daysAgo(10)),
    },
    {
      id: "exam-3",
      academy_id: academyId,
      name: "Chemistry Test 1",
      course_id: "course-chem",
      group_id: "group-3",
      date: iso(daysAgo(7)),
      max_score: 40,
      created_at: iso(daysAgo(7)),
      updated_at: iso(daysAgo(7)),
    },
  ];

  const grades: Grade[] = [];
  exams.forEach((exam) => {
    const enrolled = groupStudents.filter((gs) => gs.group_id === exam.group_id);
    const scoreSeeds = [0.95, 0.82, 0.76, 0.61, 0.88];
    enrolled.forEach((gs, i) => {
      const score = Math.round(exam.max_score * scoreSeeds[i % scoreSeeds.length]);
      grades.push({
        id: `grade-${exam.id}-${gs.student_id}`,
        exam_id: exam.id,
        student_id: gs.student_id,
        score,
        created_at: exam.date,
      });
    });
  });

  // ---- Homework ----
  const homework: Homework[] = [
    {
      id: "hw-1",
      academy_id: academyId,
      group_id: "group-1",
      lesson_id: "lesson-2",
      title: "Quadratics Worksheet",
      description: "Solve problems 1–12 on graphing quadratics.",
      deadline: iso(daysFromNow(3)),
      attachment_url: null,
      created_at: iso(daysAgo(4)),
      group: undefined,
      lesson: undefined,
    },
    {
      id: "hw-2",
      academy_id: academyId,
      group_id: "group-2",
      lesson_id: "lesson-4",
      title: "Projectile Problems",
      description: "Complete the kinematics worksheet.",
      deadline: iso(daysFromNow(2)),
      attachment_url: null,
      created_at: iso(daysAgo(5)),
      group: undefined,
      lesson: undefined,
    },
    {
      id: "hw-3",
      academy_id: academyId,
      group_id: "group-1",
      lesson_id: "lesson-3",
      title: "Geometry Proof Set",
      description: "Write proofs for the 5 given statements.",
      deadline: iso(daysAgo(2)),
      attachment_url: null,
      created_at: iso(daysAgo(9)),
      group: undefined,
      lesson: undefined,
    },
  ];

  // ---- Submissions ----
  const submissions: HomeworkSubmission[] = [];
  homework.forEach((hw) => {
    const enrolled = groupStudents.filter((gs) => gs.group_id === hw.group_id);
    enrolled.forEach((gs, i) => {
      const isOverdue = new Date(hw.deadline).getTime() < now.getTime();
      let status: HomeworkSubmission["status"] = "PENDING";
      if (isOverdue && i % 3 !== 0) status = "REVIEWED";
      else if (i % 2 === 0) status = "SUBMITTED";
      submissions.push({
        id: `sub-${hw.id}-${gs.student_id}`,
        homework_id: hw.id,
        student_id: gs.student_id,
        content: status !== "PENDING" ? "Completed all problems." : null,
        file_url: null,
        status,
        submitted_at: status !== "PENDING" ? iso(daysAgo(2)) : null,
        reviewed_at: status === "REVIEWED" ? iso(daysAgo(1)) : null,
        feedback: status === "REVIEWED" ? "Good work, watch sign errors." : null,
        grade: status === "REVIEWED" ? 9 - (i % 2) : null,
      });
    });
  });

  // ---- Notifications ----
  const notifications: AppNotification[] = [
    {
      id: "ntf-1",
      academy_id: academyId,
      user_id: "prof-admin",
      type: "payment_overdue",
      title: "Overdue payment",
      message: "Ziad Maged has an overdue payment for Chemistry.",
      link: "/payments",
      read: false,
      created_at: iso(daysAgo(1)),
    },
    {
      id: "ntf-2",
      academy_id: academyId,
      user_id: "prof-admin",
      type: "homework_assigned",
      title: "New homework",
      message: "Quadratics Worksheet assigned to Grade 9 — Math A.",
      link: "/homework",
      read: false,
      created_at: iso(daysAgo(4)),
    },
    {
      id: "ntf-3",
      academy_id: academyId,
      user_id: "prof-admin",
      type: "new_grade",
      title: "Grades published",
      message: "Physics Quiz 1 grades are now available.",
      link: "/grades",
      read: true,
      created_at: iso(daysAgo(6)),
    },
    {
      id: "ntf-4",
      academy_id: academyId,
      user_id: "prof-parent",
      type: "new_grade",
      title: "New grade for Adam",
      message: "Adam scored 48/50 on Algebra Midterm.",
      link: "/grades",
      read: false,
      created_at: iso(daysAgo(3)),
    },
    {
      id: "ntf-5",
      academy_id: academyId,
      user_id: "prof-parent",
      type: "homework_deadline",
      title: "Homework due soon",
      message: "Quadratics Worksheet is due in 3 days.",
      link: "/homework",
      read: false,
      created_at: iso(daysAgo(1)),
    },
  ];

  // ---- Notes ----
  const notes: Note[] = [
    {
      id: "note-1",
      academy_id: academyId,
      student_id: "student-1",
      author_id: "prof-admin",
      author_name: "Yasmin Hassan",
      content: "Adam is showing great improvement in algebra this month.",
      created_at: iso(daysAgo(5)),
    },
    {
      id: "note-2",
      academy_id: academyId,
      student_id: "student-5",
      author_id: "prof-teacher",
      author_name: "Omar Khaled",
      content: "Ziad was late 3 times this week — follow up with parent.",
      created_at: iso(daysAgo(2)),
    },
  ];

  const files: FileRecord[] = [];

  return {
    academies: [academy],
    profiles,
    courses,
    teachers,
    parents,
    students,
    groups,
    groupStudents,
    groupAssistants: [],
    lessons,
    attendance,
    payments,
    transactions,
    exams,
    grades,
    homework,
    submissions,
    notifications,
    notes,
    messages: [],
    auditLogs: [],
    subscriptions: [],
    files,
  };
}
