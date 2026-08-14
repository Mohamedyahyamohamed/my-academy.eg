/**
 * SaaS Subscription & Usage Limits.
 * Enforced SERVER-SIDE (never UI-only).
 */
import { collections } from "./data/store";
import { currentAcademyId } from "./session";

export interface Plan {
  id: string;
  name: string;
  description: string;
  maxStudents: number;
  maxTeachers: number;
  maxGroups: number;
  maxAcademies: number;
  maxStorageMb: number;
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

/** Default plans (mirrors SQL). Editable from configuration. */
export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "مجاني",
    description: "لبدء تجربة الأكاديمية وإدارة فريق صغير.",
    maxStudents: 50,
    maxTeachers: 3,
    maxGroups: 5,
    maxAcademies: 1,
    maxStorageMb: 250,
    price: 0,
    currency: "EGP",
  },
  basic: {
    id: "basic",
    name: "أساسي",
    description: "للأكاديميات الصغيرة التي بدأت تستقبل طلابًا فعليين.",
    maxStudents: 200,
    maxTeachers: 10,
    maxGroups: 25,
    maxAcademies: 1,
    maxStorageMb: 2048,
    price: 399,
    currency: "EGP",
  },
  pro: {
    id: "pro",
    name: "احترافي",
    description: "للأكاديميات النامية مع فريق أكبر وتقارير متقدمة.",
    maxStudents: 750,
    maxTeachers: 35,
    maxGroups: 100,
    maxAcademies: 3,
    maxStorageMb: 10240,
    price: 899,
    currency: "EGP",
  },
  enterprise: {
    id: "enterprise",
    name: "مؤسسات",
    description: "للمجموعات التعليمية والفروع المتعددة باحتياجات مخصصة.",
    maxStudents: 5000,
    maxTeachers: 200,
    maxGroups: 500,
    maxAcademies: 10,
    maxStorageMb: 51200,
    price: 2499,
    currency: "EGP",
  },
};

export function listPlans(): Plan[] {
  return Object.values(PLANS);
}

/** Get the academy's current plan (defaults to Free). */
export function getPlan(academyId?: string): Plan {
  const aid = academyId ?? currentAcademyId();
  const sub = (collections() as any).subscriptions?.find(
    (s: any) => s.academy_id === aid,
  );
  const planId = sub?.plan_id ?? "free";
  return PLANS[planId] ?? PLANS.free;
}

/** Get subscription status. */
export function getSubscriptionStatus(academyId?: string): Subscription {
  const aid = academyId ?? currentAcademyId();
  const sub = (collections() as any).subscriptions?.find(
    (s: any) => s.academy_id === aid,
  );
  return {
    academyId: aid,
    planId: sub?.plan_id ?? "free",
    status: sub?.status ?? "active",
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
  };
}

export interface UsageCounts {
  students: number;
  teachers: number;
  groups: number;
}

/** Count current usage for the academy. */
export function getUsage(academyId?: string): UsageCounts {
  const aid = academyId ?? currentAcademyId();
  const c = collections();
  return {
    students: c.students.filter((s: any) => s.academy_id === aid).length,
    teachers: c.teachers.filter((t: any) => t.academy_id === aid).length,
    groups: c.groups.filter((g: any) => g.academy_id === aid).length,
  };
}

/** Check if the academy can add more of an entity type. */
export function canCreate(
  type: "students" | "teachers" | "groups",
  academyId?: string,
): { allowed: boolean; limit: number; current: number } {
  const plan = getPlan(academyId);
  const usage = getUsage(academyId);
  const limit = type === "students" ? plan.maxStudents : type === "teachers" ? plan.maxTeachers : plan.maxGroups;
  const current = usage[type];
  return { allowed: current < limit, limit, current };
}

/** Upgrade/downgrade plan (admin only). */
export function setPlan(academyId: string, planId: string): void {
  const subs = (collections() as any).subscriptions ?? [];
  const existing = subs.find((s: any) => s.academy_id === academyId);
  if (existing) {
    existing.plan_id = planId;
    existing.updated_at = new Date().toISOString();
  } else {
    subs.push({
      id: crypto.randomUUID(),
      academy_id: academyId,
      plan_id: planId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    (collections() as any).subscriptions = subs;
  }
}
