/**
 * Payments service.
 * Enforces: no negative amounts, no invalid student references,
 * automatic remaining + status computation.
 */
import type { PaginatedResult, Payment, PaymentStatus } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { derivePayment, getGroup, getParent, byAcademy, fetchTableRLS } from "./_shared";
import { fullName } from "./_shared";

function attach(p: Payment): Payment {
  const d = derivePayment(p);
  const student = collections().students.find((s) => s.id === p.student_id);
  return {
    ...d,
    student: student
      ? { ...student, parent: getParent(student.parent_id) ?? null }
      : undefined,
    group: getGroup(p.group_id) ?? undefined,
  };
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | "ALL";
  month?: string | "ALL";
  groupId?: string | "ALL";
  studentId?: string | "ALL";
  page?: number;
  pageSize?: number;
}

export async function listPayments(
  filters: PaymentFilters = {},
  academyId?: string,
): Promise<PaginatedResult<Payment>> {
  const {
    search = "",
    status = "ALL",
    month = "ALL",
    groupId = "ALL",
    studentId = "ALL",
    page = 1,
    pageSize = 10,
  } = filters;

  const authenticatedAcademyId = currentAcademyId();
  const requestedAcademyId = academyId ?? authenticatedAcademyId;
  if (!authenticatedAcademyId || requestedAcademyId !== authenticatedAcademyId) {
    return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
  }
  let items = (await fetchTableRLS<Payment>("payments", authenticatedAcademyId)).filter((p: any) => !p.deleted_at).map(derivePayment);

  if (status !== "ALL") items = items.filter((p) => p.status === status);
  if (month !== "ALL") items = items.filter((p) => p.month === month);
  if (groupId !== "ALL") items = items.filter((p) => p.group_id === groupId);
  if (studentId !== "ALL")
    items = items.filter((p) => p.student_id === studentId);
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter((p) => {
      const s = collections().students.find((x) => x.id === p.student_id);
      return s && fullName(s).toLowerCase().includes(q);
    });
  }

  items.sort((a, b) =>
    a.month === b.month
      ? (b.amount_due - b.amount_paid) - (a.amount_due - a.amount_paid)
      : a.month < b.month
        ? 1
        : -1,
  );

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map(attach),
    pagination: { page, pageSize, total, totalPages },
  };
}

export function getPayment(id: string, academyId?: string): Payment | null {
  const authenticatedAcademyId = currentAcademyId();
  const requestedAcademyId = academyId ?? authenticatedAcademyId;
  // A caller may provide an explicit scope for filtering, but it can never
  // widen the authenticated tenant. Fail closed on missing or mismatched scope.
  if (!authenticatedAcademyId || requestedAcademyId !== authenticatedAcademyId) return null;
  const p = collections().payments.find((x) => x.id === id && x.academy_id === authenticatedAcademyId);
  return p ? attach(p) : null;
}

export interface CreatePaymentInput {
  student_id: string;
  group_id?: string | null;
  month: string;
  amount_due: number;
  amount_paid?: number;
  due_date?: string;
  method?: string | null;
  notes?: string | null;
}

async function validStudent(id: string, academyId: string) {
  const students = await fetchTableRLS<Payment & { id: string }>("students", academyId);
  return students.some((student) => student.id === id);
}

function pid() {
  return crypto.randomUUID();
}

export async function createPayment(input: CreatePaymentInput, academyIdOverride?: string): Promise<{
  ok: boolean;
  error?: string;
  payment?: Payment;
}> {
  // Capture the tenant before any await. Next Server Actions can lose the
  // AsyncLocalStorage request context across multiple awaited reads.
  const authenticatedAcademyId = currentAcademyId();
  const academyId = academyIdOverride ?? authenticatedAcademyId;
  if (!authenticatedAcademyId || academyId !== authenticatedAcademyId) {
    return { ok: false, error: "Payment academy scope mismatch." };
  }
  if (!(await validStudent(input.student_id, authenticatedAcademyId)))
    return { ok: false, error: "Invalid student." };
  if (input.amount_due < 0 || (input.amount_paid ?? 0) < 0)
    return { ok: false, error: "Amounts cannot be negative." };
  if ((input.amount_paid ?? 0) > input.amount_due)
    return { ok: false, error: "Paid amount cannot exceed amount due." };

  const now = new Date().toISOString();
  const draft: Payment = {
    id: pid(),
    academy_id: academyId,
    student_id: input.student_id,
    group_id: input.group_id ?? null,
    month: input.month,
    amount_due: input.amount_due,
    amount_paid: input.amount_paid ?? 0,
    remaining: 0,
    due_date: input.due_date ?? now.slice(0, 10),
    payment_date: (input.amount_paid ?? 0) > 0 ? now : null,
    method: input.method ?? null,
    status: "UNPAID",
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
  const payment = derivePayment(draft);
  // `remaining` is a GENERATED column in Postgres — never insert it.
  const { remaining: _r, ...paymentPersist } = payment;
  await persistInsert("payments", paymentPersist);
  collections().payments.push(payment);
  if (payment.amount_paid > 0) {
    const tx = {
      id: crypto.randomUUID(),
      payment_id: payment.id,
      amount: payment.amount_paid,
      method: input.method ?? "Cash",
      paid_at: now,
      note: null,
    };
    await persistInsert("payment_transactions", tx);
    collections().transactions.push(tx);
  }
  return { ok: true, payment: attach(payment) };
}

/** Record an additional payment against an existing payment. */
export async function recordPayment(
  paymentId: string,
  amount: number,
  method: string,
  note?: string,
  academyId?: string,
): Promise<{ ok: boolean; error?: string; payment?: Payment }> {
  const authenticatedAcademyId = currentAcademyId();
  if (!authenticatedAcademyId || (academyId && academyId !== authenticatedAcademyId)) return { ok: false, error: "Payment academy scope mismatch." };
  const p = collections().payments.find((x) => x.id === paymentId && x.academy_id === authenticatedAcademyId);
  if (!p) return { ok: false, error: "Payment not found." };
  if (amount <= 0) return { ok: false, error: "Amount must be positive." };
  const newPaid = p.amount_paid + amount;
  if (newPaid > p.amount_due)
    return { ok: false, error: "Payment exceeds remaining balance." };
  p.amount_paid = newPaid;
  const now = new Date().toISOString();
  p.payment_date = now;
  p.method = method;
  p.notes = note ?? p.notes;
  p.status = derivePayment(p).status;
  p.updated_at = now;
  await persistUpdate("payments", paymentId, {
    amount_paid: p.amount_paid, payment_date: now, method, status: p.status,
    notes: note ?? p.notes, updated_at: now,
  });
  const tx = {
    id: crypto.randomUUID(),
    payment_id: paymentId,
    amount,
    method,
    paid_at: now,
    note: note ?? null,
  };
  collections().transactions.push(tx);
  await persistInsert("payment_transactions", tx);
  return { ok: true, payment: attach(p) };
}

export async function deletePayment(id: string, academyId?: string): Promise<boolean> {
  // Soft delete — never hard-delete financial records.
  const authenticatedAcademyId = currentAcademyId();
  if (!authenticatedAcademyId || (academyId && academyId !== authenticatedAcademyId)) return false;
  const p = collections().payments.find((x) => x.id === id && x.academy_id === authenticatedAcademyId);
  if (!p) return false;
  p.deleted_at = new Date().toISOString();
  await persistUpdate("payments", id, { deleted_at: p.deleted_at });
  // Remove from active list (still in DB with deleted_at).
  collections().payments = collections().payments.filter((x) => x.id !== id);
  return true;
}

/* ---------------- Metrics ---------------- */

export interface PaymentMetrics {
  monthlyRevenue: number; // potential revenue this month
  collectedThisMonth: number;
  outstanding: number;
  collectedInRange: number; // collected over the requested range
  revenueByMonth: { month: string; revenue: number; collected: number }[];
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getPaymentMetrics(months = 6, academyId?: string): Promise<PaymentMetrics> {
  const pays = (await fetchTableRLS<Payment>("payments", academyId)).map(derivePayment);
  const cm = currentMonthKey();
  const thisMonth = pays.filter((p) => p.month === cm);
  const monthlyRevenue = thisMonth.reduce((s, p) => s + p.amount_due, 0);
  const collectedThisMonth = thisMonth.reduce((s, p) => s + p.amount_paid, 0);
  const outstanding = pays.reduce((s, p) => s + p.remaining, 0);

  // last `months` months
  const byMonth = new Map<string, { revenue: number; collected: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    byMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, {
      revenue: 0,
      collected: 0,
    });
  }
  for (const p of pays) {
    const entry = byMonth.get(p.month);
    if (entry) {
      entry.revenue += p.amount_due;
      entry.collected += p.amount_paid;
    }
  }
  const revenueByMonth = [...byMonth.entries()].map(([month, v]) => ({
    month,
    revenue: v.revenue,
    collected: v.collected,
  }));
  const collectedInRange = revenueByMonth.reduce((s, r) => s + r.collected, 0);

  return { monthlyRevenue, collectedThisMonth, outstanding, collectedInRange, revenueByMonth };
}
