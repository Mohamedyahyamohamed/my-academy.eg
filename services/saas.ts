/**
 * SaaS Subscription & Usage Limits.
 * Enforced SERVER-SIDE (never UI-only).
 */
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export type WorkspaceType = "ACADEMY" | "TEACHER";
export type PlanAudience = WorkspaceType;

export interface Plan {
  id: string;
  audience: PlanAudience;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  maxStudents: number;
  maxTeachers: number;
  maxGroups: number;
  maxAcademies: number;
  maxStorageMb: number;
  maxCourses: number;
  maxLessons: number;
  price: number;
  currency: string;
}

export interface Subscription {
  academyId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Two separate catalogs are intentional:
 * - TEACHER workspaces are for one independent teacher and have smaller,
 *   student-focused limits.
 * - ACADEMY workspaces support teams, groups, branches and many teachers.
 *
 * The legacy academy IDs (free/basic/pro/enterprise) are retained so existing
 * subscriptions keep working without a database rewrite.
 */
export const PLANS: Record<string, Plan> = {
  teacher_free: {
    id: "teacher_free",
    audience: "TEACHER",
    name: "مدرس مجاني",
    nameEn: "Teacher Free",
    description: "لبدء تنظيم طلابك ومجموعاتك دون تكلفة.",
    descriptionEn: "Start organizing your students and groups at no cost.",
    maxStudents: 30,
    maxTeachers: 1,
    maxGroups: 5,
    maxAcademies: 1,
    maxStorageMb: 250,
    maxCourses: 5,
    maxLessons: 50,
    price: 0,
    currency: "EGP",
  },
  teacher_basic: {
    id: "teacher_basic",
    audience: "TEACHER",
    name: "مدرس أساسي",
    nameEn: "Teacher Basic",
    description: "للمدرس المستقل الذي يدير عددًا أكبر من الطلاب.",
    descriptionEn: "For independent teachers managing a growing student list.",
    maxStudents: 100,
    maxTeachers: 1,
    maxGroups: 15,
    maxAcademies: 1,
    maxStorageMb: 1024,
    maxCourses: 20,
    maxLessons: 200,
    price: 99,
    currency: "EGP",
  },
  teacher_pro: {
    id: "teacher_pro",
    audience: "TEACHER",
    name: "مدرس احترافي",
    nameEn: "Teacher Pro",
    description: "للحصص والمجموعات الأكبر مع مساحة تخزين أوسع.",
    descriptionEn: "For larger classes, more groups and extra storage.",
    maxStudents: 300,
    maxTeachers: 1,
    maxGroups: 40,
    maxAcademies: 1,
    maxStorageMb: 5120,
    maxCourses: 60,
    maxLessons: 600,
    price: 199,
    currency: "EGP",
  },
  teacher_plus: {
    id: "teacher_plus",
    audience: "TEACHER",
    name: "مدرس بلس",
    nameEn: "Teacher Plus",
    description: "للمدرسين المستقلين ذوي قاعدة الطلاب الكبيرة.",
    descriptionEn: "For independent teachers with a large student base.",
    maxStudents: 750,
    maxTeachers: 1,
    maxGroups: 100,
    maxAcademies: 1,
    maxStorageMb: 10240,
    maxCourses: 150,
    maxLessons: 1500,
    price: 349,
    currency: "EGP",
  },
  free: {
    id: "free",
    audience: "ACADEMY",
    name: "مجاني",
    nameEn: "Free",
    description: "لبدء تجربة الأكاديمية وإدارة فريق صغير.",
    descriptionEn: "Start your academy with a small team.",
    maxStudents: 50,
    maxTeachers: 3,
    maxGroups: 5,
    maxAcademies: 1,
    maxStorageMb: 250,
    maxCourses: 10,
    maxLessons: 100,
    price: 0,
    currency: "EGP",
  },
  basic: {
    id: "basic",
    audience: "ACADEMY",
    name: "أساسي",
    nameEn: "Academy Basic",
    description: "للأكاديميات الصغيرة التي بدأت تستقبل طلابًا فعليين.",
    descriptionEn: "For small academies welcoming their first active students.",
    maxStudents: 200,
    maxTeachers: 10,
    maxGroups: 25,
    maxAcademies: 1,
    maxStorageMb: 2048,
    maxCourses: 50,
    maxLessons: 500,
    price: 399,
    currency: "EGP",
  },
  pro: {
    id: "pro",
    audience: "ACADEMY",
    name: "احترافي",
    nameEn: "Academy Pro",
    description: "للأكاديميات النامية مع فريق أكبر وتقارير متقدمة.",
    descriptionEn: "For growing academies with larger teams and advanced reporting.",
    maxStudents: 750,
    maxTeachers: 35,
    maxGroups: 100,
    maxAcademies: 3,
    maxStorageMb: 10240,
    maxCourses: 200,
    maxLessons: 2000,
    price: 899,
    currency: "EGP",
  },
  enterprise: {
    id: "enterprise",
    audience: "ACADEMY",
    name: "مؤسسات",
    nameEn: "Enterprise",
    description: "للمجموعات التعليمية والفروع المتعددة باحتياجات مخصصة.",
    descriptionEn: "For multi-branch education groups with custom requirements.",
    maxStudents: 5000,
    maxTeachers: 200,
    maxGroups: 500,
    maxAcademies: 10,
    maxStorageMb: 51200,
    maxCourses: 1000,
    maxLessons: 10000,
    price: 2499,
    currency: "EGP",
  },
};

const DEFAULT_PLAN_ID: Record<WorkspaceType, string> = {
  TEACHER: "teacher_free",
  ACADEMY: "free",
};

/** Normalize legacy IDs and reject a plan from the wrong catalog. */
export function resolvePlanIdForWorkspace(planId: string, workspaceType: WorkspaceType): string | null {
  if (workspaceType === "TEACHER" && planId === "free") return "teacher_free";
  const plan = PLANS[planId];
  if (!plan || plan.audience !== workspaceType) return null;
  return plan.id;
}

export function getWorkspaceType(academyId?: string): WorkspaceType {
  const aid = academyId ?? currentAcademyId();
  const academy = collections().academies.find((item: any) => item.id === aid) as any;
  return academy?.workspace_type === "TEACHER" ? "TEACHER" : "ACADEMY";
}

export function listPlans(workspaceType?: WorkspaceType): Plan[] {
  const plans = Object.values(PLANS);
  return workspaceType ? plans.filter((plan) => plan.audience === workspaceType) : plans;
}

/** Get the workspace's current plan (defaults to the correct catalog). */
export function getPlan(academyId?: string): Plan {
  const aid = academyId ?? currentAcademyId();
  const workspaceType = getWorkspaceType(aid);
  const sub = (collections() as any).subscriptions?.find((s: any) => s.academy_id === aid);
  const planId = resolvePlanIdForWorkspace(sub?.plan_id ?? DEFAULT_PLAN_ID[workspaceType], workspaceType) ?? DEFAULT_PLAN_ID[workspaceType];
  return PLANS[planId];
}

/** Get subscription status. */
export function getSubscriptionStatus(academyId?: string): Subscription {
  const aid = academyId ?? currentAcademyId();
  const workspaceType = getWorkspaceType(aid);
  const sub = (collections() as any).subscriptions?.find((s: any) => s.academy_id === aid);
  return {
    academyId: aid,
    planId: resolvePlanIdForWorkspace(sub?.plan_id ?? DEFAULT_PLAN_ID[workspaceType], workspaceType) ?? DEFAULT_PLAN_ID[workspaceType],
    status: sub?.status ?? "active",
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
  };
}

export interface UsageCounts {
  students: number;
  teachers: number;
  groups: number;
  courses: number;
  lessons: number;
}

/**
 * Count current usage for the workspace.
 *
 * When Supabase is configured we read the live count with a server-only
 * (service-role) client narrowed by the trusted academy_id. This avoids the
 * stale tenant snapshot (TTL 60s) that previously let usage drift after a
 * write and either blocked a valid action or let a limit be exceeded.
 *
 * If the Supabase read fails we do NOT treat the action as allowed: we fall
 * back to the snapshot count but log loudly, so a transient DB error cannot
 * silently lift a plan limit.
 */
export async function getUsage(academyId?: string): Promise<UsageCounts> {
  const aid = academyId ?? currentAcademyId();
  const c = collections();
  const snapshotCounts: UsageCounts = {
    students: c.students.filter((s: any) => s.academy_id === aid).length,
    teachers: c.teachers.filter((t: any) => t.academy_id === aid).length,
    groups: c.groups.filter((g: any) => g.academy_id === aid).length,
    courses: ((c as any).contentCourses ?? []).filter((item: any) => item.academy_id === aid).length,
    lessons: ((c as any).contentLessons ?? []).filter((item: any) => item.academy_id === aid).length,
  };

  if (!isSupabaseConfigured() || !aid) return snapshotCounts;

  const client = nodeSupabaseClient();
  if (!client) return snapshotCounts;

  const tableFor = (type: keyof UsageCounts): string | null => {
    switch (type) {
      case "students": return "students";
      case "teachers": return "teachers";
      case "groups": return "groups";
      case "courses": return "content_courses";
      case "lessons": return "content_lessons";
    }
  };

  let usedSnapshotFallback = false;
  const counts = { ...snapshotCounts };
  for (const type of Object.keys(snapshotCounts) as (keyof UsageCounts)[]) {
    const table = tableFor(type);
    if (!table) continue;
    try {
      const { count, error } = await client
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("academy_id", aid);
      if (error) {
        usedSnapshotFallback = true;
        console.error(`[saas] getUsage ${table} count failed for ${aid}: ${error.message}`);
        continue;
      }
      counts[type] = count ?? snapshotCounts[type];
    } catch (error) {
      usedSnapshotFallback = true;
      console.error(`[saas] getUsage ${table} count threw for ${aid}:`, (error as Error)?.message);
    }
  }
  if (usedSnapshotFallback) {
    console.warn(`[saas] getUsage fell back to stale snapshot for ${aid}; limit check is best-effort.`);
  }
  return counts;
}

/** Check if the workspace can add more of an entity type (server-enforced). */
export async function canCreate(
  type: "students" | "teachers" | "groups" | "courses" | "lessons",
  academyId?: string,
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const plan = getPlan(academyId);
  const usage = await getUsage(academyId);
  const limit = type === "students" ? plan.maxStudents : type === "teachers" ? plan.maxTeachers : type === "groups" ? plan.maxGroups : type === "courses" ? plan.maxCourses : plan.maxLessons;
  const current = usage[type];
  return { allowed: current < limit, limit, current };
}

/** Upgrade/downgrade plan (admin or teacher workspace owner only). */
export function setPlan(academyId: string, planId: string): void {
  const workspaceType = getWorkspaceType(academyId);
  const resolvedPlanId = resolvePlanIdForWorkspace(planId, workspaceType);
  if (!resolvedPlanId) return;
  const subs = (collections() as any).subscriptions ?? [];
  const existing = subs.find((s: any) => s.academy_id === academyId);
  if (existing) {
    existing.plan_id = resolvedPlanId;
    existing.updated_at = new Date().toISOString();
  } else {
    subs.push({
      id: crypto.randomUUID(),
      academy_id: academyId,
      plan_id: resolvedPlanId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    (collections() as any).subscriptions = subs;
  }
}
