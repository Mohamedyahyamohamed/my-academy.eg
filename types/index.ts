/**
 * Domain types for MY Academy.
 * These mirror the PostgreSQL schema in /supabase/schema.sql.
 * Every academy-owned entity carries `academy_id` for multi-tenancy.
 */

export type UUID = string;
export type ISODate = string;

export type Role = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "PARENT" | "STUDENT";

/** A user's active role inside one academy. Memberships are the authorization source. */
export interface AcademyMembership {
  id?: UUID;
  academy_id: UUID;
  role: Role;
  status?: "INVITED" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  academy_name?: string;
  academy_slug?: string;
  joined_at?: ISODate | null;
}

export type Gender = "male" | "female";

/** A Supabase auth user's profile (1:1 with auth.users). */
export interface Profile {
  id: UUID;
  academy_id: UUID;
  email: string;
  role: Role;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

/** Authenticated session user (profile + auth metadata). */
export interface SessionUser {
  id: UUID;
  email: string;
  role: Role;
  full_name: string;
  avatar_url: string | null;
  /** The academy currently selected for this request. */
  academy_id: UUID;
  /** Explicit active membership identifier when available. */
  active_membership_id?: UUID;
  /** Active academy memberships available to the signed-in user. */
  memberships?: AcademyMembership[];
  /** True only for a teacher account operating as a limited group assistant. */
  is_assistant?: boolean;
}

export interface Academy {
  id: UUID;
  name: string;
  slug: string;
  logo_url: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  /** Distinguishes an independent teacher workspace from an academy workspace. */
  workspace_type?: "ACADEMY" | "TEACHER";
  phone: string | null;
  email: string | null;
  address: string | null;
  /** Platform-wide soft suspension state; data remains preserved when false. */
  is_active?: boolean;
  suspension_reason?: string | null;
  suspended_at?: ISODate | null;
  suspended_by?: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Course {
  id: UUID;
  academy_id: UUID;
  name: string;
  description: string | null;
  color: string | null; // tailwind-ish hex for charts/badges
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ContentCourse {
  id: UUID;
  academy_id: UUID;
  teacher_id: UUID;
  group_id: UUID;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  teacher?: Teacher;
  group?: Group;
  lessons?: ContentLesson[];
  files?: ContentFile[];
  links?: ContentLink[];
}

export interface ContentLesson {
  id: UUID;
  academy_id: UUID;
  course_id: UUID;
  title: string;
  description: string | null;
  video_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  files?: ContentFile[];
  links?: ContentLink[];
  completed?: boolean;
}

export interface ContentLink {
  id: UUID;
  academy_id: UUID;
  course_id: UUID;
  lesson_id: UUID | null;
  owner_id: UUID | null;
  title: string;
  url: string;
  created_at: ISODate;
}

export interface ContentFile {
  id: UUID;
  academy_id: UUID;
  course_id: UUID;
  lesson_id: UUID | null;
  owner_id: UUID | null;
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  created_at: ISODate;
  download_url?: string;
}

export interface ContentProgress {
  id: UUID;
  academy_id: UUID;
  student_id: UUID;
  lesson_id: UUID;
  completed_at: ISODate;
}

export interface Teacher {
  id: UUID;
  academy_id: UUID;
  profile_id: UUID | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Parent {
  id: UUID;
  academy_id: UUID;
  profile_id: UUID | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export type StudentStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Student {
  id: UUID;
  academy_id: UUID;
  /** Personal-workspace owner; null for academy-managed students. */
  owner_teacher_id?: UUID | null;
  first_name: string;
  last_name: string;
  date_of_birth: ISODate | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  parent_id: UUID | null;
  school: string | null;
  grade: string | null; // e.g. "Grade 9"
  notes: string | null;
  status: StudentStatus;
  /** Lifecycle flag; false means archived/hidden from active lists. */
  is_active?: boolean;
  consent_given?: boolean;
  consent_at?: ISODate | null;
  consent_by?: UUID | null;
  consent_version?: string | null;
  enrolled_at: ISODate;
  created_at: ISODate;
  updated_at: ISODate;
  // joined relations (optional)
  parent?: Parent | null;
  groups?: Group[];
}

export interface Group {
  id: UUID;
  academy_id: UUID;
  name: string;
  course_id: UUID;
  teacher_id: UUID;
  monthly_fee: number;
  schedule: string; // human readable e.g. "Sun, Tue, Thu — 4:00 PM"
  room: string | null;
  status: "ACTIVE" | "INACTIVE";
  /** Lifecycle flag; false means archived/hidden from active lists. */
  is_active?: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  // relations
  course?: Course;
  teacher?: Teacher;
  student_count?: number;
}

export interface GroupStudent {
  id: UUID;
  group_id: UUID;
  student_id: UUID;
  joined_at: ISODate;
}

export type LessonStatus = "scheduled" | "canceled" | "completed";

export interface Lesson {
  id: UUID;
  academy_id: UUID;
  group_id: UUID;
  teacher_id: UUID;
  date: ISODate;
  start_time: string; // "16:00"
  end_time: string; // "17:30"
  topic: string;
  description: string | null;
  notes: string | null;
  /** Canonical lifecycle status persisted in PostgreSQL. */
  status?: LessonStatus;
  /** Legacy cancellation flags remain readable for older rows and clients. */
  is_cancelled?: boolean;
  cancellation_reason?: string | null;
  created_at: ISODate;
  updated_at: ISODate;
  // relations
  group?: Group;
  teacher?: Teacher;
  attendance_taken?: boolean;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface AttendanceRecord {
  id: UUID;
  lesson_id: UUID;
  student_id: UUID;
  status: AttendanceStatus;
  /** Legacy singular column retained for compatibility with existing rows. */
  note: string | null;
  /** Canonical plural notes column for manual attendance explanations. */
  notes?: string | null;
  recorded_at: ISODate;
  // relations
  student?: Student;
}

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export interface Payment {
  id: UUID;
  academy_id: UUID;
  student_id: UUID;
  group_id: UUID | null;
  month: string; // "2026-08"
  amount_due: number;
  amount_paid: number;
  remaining: number;
  due_date: ISODate;
  payment_date: ISODate | null;
  method: string | null;
  status: PaymentStatus;
  notes: string | null;
  deleted_at?: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
  // relations
  student?: Student;
  group?: Group;
}

export interface PaymentTransaction {
  id: UUID;
  payment_id: UUID;
  amount: number;
  method: string;
  paid_at: ISODate;
  note: string | null;
}

export interface Exam {
  id: UUID;
  academy_id: UUID;
  name: string;
  course_id: UUID;
  group_id: UUID;
  date: ISODate;
  max_score: number;
  created_at: ISODate;
  updated_at: ISODate;
  course?: Course;
  group?: Group;
}

export interface Grade {
  id: UUID;
  exam_id: UUID;
  student_id: UUID;
  score: number;
  created_at: ISODate;
  // computed
  percentage?: number;
  level?: string;
  student?: Student;
}

export type HomeworkStatus = "PENDING" | "SUBMITTED" | "REVIEWED";

export interface Homework {
  id: UUID;
  academy_id: UUID;
  group_id: UUID;
  lesson_id: UUID | null;
  title: string;
  description: string;
  deadline: ISODate;
  attachment_url: string | null;
  created_at: ISODate;
  group?: Group;
  lesson?: Lesson;
}

export interface HomeworkSubmission {
  id: UUID;
  homework_id: UUID;
  student_id: UUID;
  content: string | null;
  /** Stable registry id; file_url is retained for backward compatibility. */
  file_id?: UUID | null;
  file_url: string | null;
  status: HomeworkStatus;
  submitted_at: ISODate | null;
  reviewed_at: ISODate | null;
  feedback: string | null;
  grade: number | null;
  homework?: Homework;
  student?: Student;
}

export type NotificationType =
  | "payment_overdue"
  | "payment_received"
  | "homework_assigned"
  | "homework_reviewed"
  | "homework_deadline"
  | "new_grade"
  | "upcoming_lesson"
  | "attendance"
  | "system";

export interface AppNotification {
  id: UUID;
  academy_id: UUID;
  user_id: UUID | null; // profile id; null = broadcast
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: ISODate;
}

export interface Note {
  id: UUID;
  academy_id: UUID;
  student_id: UUID;
  author_id: UUID | null;
  author_name: string | null;
  content: string;
  created_at: ISODate;
}

export interface FileRecord {
  id: UUID;
  academy_id: UUID;
  owner_id: UUID | null;
  name: string;
  url: string;
  size: number | null;
  mime_type: string | null;
  created_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Aggregated / view models used by the UI                             */
/* ------------------------------------------------------------------ */

export interface StudentDetail extends Student {
  parent?: Parent | null;
  groups?: (Group & { course?: Course })[];
  stats?: StudentStats;
}

export interface StudentStats {
  attendanceRate: number;
  averageGrade: number;
  monthlyFee: number;
  totalPaid: number;
  outstanding: number;
  attendanceTrend: { label: string; rate: number }[];
  gradeTrend: { label: string; score: number }[];
}

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  totalGroups: number;
  monthlyRevenue: number;
  collectedThisMonth: number;
  outstanding: number;
  attendanceRate: number;
  averageGrade: number;
  collectionTrend: number;
  revenueByMonth: { month: string; revenue: number; collected: number }[];
  studentsByCourse: { course: string; students: number; color: string }[];
  attendanceTrend: { week: string; rate: number }[];
  gradePerformance: { level: string; count: number }[];
}

export type DashboardPeriod = "month" | "quarter" | "year";

export interface DashboardData extends DashboardMetrics {
  period: DashboardPeriod;
  collectedForPeriod: number;
  upcomingLessons: (Lesson & { group?: Group; teacher?: Teacher })[];
  recentPayments: (Payment & { student?: Student })[];
  outstandingStudents: (Payment & { student?: Student })[];
  studentsNeedingAttention: Student[];
}

export interface AnalyticsData {
  studentGrowth: { month: string; students: number }[];
  monthlyRevenue: { month: string; revenue: number; collected: number }[];
  attendanceTrend: { month: string; rate: number }[];
  averageGrades: { course: string; average: number }[];
  retention: { cohort: string; retained: number }[];
  popularCourses: { course: string; students: number; revenue: number }[];
  profitableGroups: { group: string; revenue: number; students: number }[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface StudentFilters {
  search?: string;
  status?: StudentStatus | "ALL";
  groupId?: UUID | "ALL";
  grade?: string | "ALL";
  gender?: Gender | "ALL";
  course?: UUID | "ALL";
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "created_at" | "status";
  sortDir?: "asc" | "desc";
}
