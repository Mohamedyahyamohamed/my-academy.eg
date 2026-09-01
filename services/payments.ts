/**
 * Payments service.
 * Enforces: no negative amounts, no invalid student references,
 * automatic remaining + status computation.
 */
import type { PaginatedResult, Payment, PaymentStatus } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "./supabase/config";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { derivePayment, getGroup, getParent, byAcademy, fetchTableRLS } from "./_shared";
import { fullName } from "./_shared";

function attach(p: Payment): Payment {
  const d = derivePayment(p);
  const student = collections().students.find((s) => s.id === p.student_id);
  const safeStudent = student
    ? (({ access_token: _accessToken, ...withoutToken }) => withoutToken)(student)
    : undefined;
  return {
    ...d,
    student: safeStudent
      ? { ...safeStudent, parent: getParent(safeStudent.parent_id) ?? null }
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
  if (month !== "ALL") items = items.filter((p) => (p.month_year ?? p.month) === month);
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
    (a.month_year ?? a.month) === (b.month_year ?? b.month)
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
  fee_type?: "monthly" | "half_month" | string | null;
  amount_due: number;
  amount_paid?: number;
  due_date?: string;
  method?: string | null;
  notes?: string | null;
}

async function validStudent(id: string, academyId: string) {
  const students = await fetchTableRLS<{ id: string; academy_id: string }>("students", academyId);
  return students.some((student) => student.id === id && student.academy_id === academyId);
}

async function validPaymentGroup(studentId: string, groupId: string | null | undefined, academyId: string) {
  if (!groupId) return true;
  const groups = await fetchTableRLS<{ id: string; academy_id: string }>("groups", academyId);
  if (!groups.some((group) => group.id === groupId && group.academy_id === academyId)) return false;
  const memberships = await fetchTableRLS<{ group_id: string; student_id: string }>("group_students", academyId);
  return memberships.some((membership) => membership.group_id === groupId && membership.student_id === studentId);
}

function pid() {
  return crypto.randomUUID();
}

async function runAtomicPaymentRpc(input: {
  academyId: string;
  paymentId?: string | null;
  studentId: string;
  groupId?: string | null;
  month: string;
  amountDue: number;
  amountPaid: number;
  method?: string | null;
  notes?: string | null;
}) {
  const client = nodeSupabaseClient();
  if (!client) return { data: null, error: new Error("Database client is unavailable.") };
  try {
    const { data, error } = await client.rpc("record_payment_atomic", {
      p_academy_id: input.academyId,
      p_payment_id: input.paymentId ?? null,
      p_student_id: input.studentId,
      p_group_id: input.groupId ?? null,
      p_month_year: input.month,
      p_amount_due: input.amountDue,
      p_amount_paid: input.amountPaid,
      p_method: input.method ?? "Cash",
      p_notes: input.notes ?? null,
    });
    if (error) return { data: null, error };
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  } catch (err) {
    // The RPC may throw (e.g. function not deployed, permissions) instead of
    // returning an error object. Surface it as a clean error, not an exception
    // that the caller would rethrow as a generic "try again" message.
    return { data: null, error: err instanceof Error ? err : new Error("record_payment_atomic failed") };
  }
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
  if (!(await validPaymentGroup(input.student_id, input.group_id, authenticatedAcademyId)))
    return { ok: false, error: "Student is not enrolled in this academy group." };
  if (input.amount_due < 0 || (input.amount_paid ?? 0) < 0)
    return { ok: false, error: "Amounts cannot be negative." };
  if ((input.amount_paid ?? 0) > input.amount_due)
    return { ok: false, error: "Paid amount cannot exceed amount due." };

  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const atomic = await runAtomicPaymentRpc({
      academyId,
      studentId: input.student_id,
      groupId: input.group_id,
      month: input.month,
      amountDue: input.amount_due,
      amountPaid: input.amount_paid ?? 0,
      method: input.method,
      notes: input.notes,
    });
    if (atomic.error || !atomic.data) {
      // RPC failed (e.g. not deployed, permissions, or unexpected exception).
      // Fall back to a direct insert so payment recording still works instead of
      // surfacing a generic failure. This keeps the flow resilient if the
      // record_payment_atomic function is missing on a given environment.
      console.warn("record_payment_atomic failed, falling back to direct insert:", atomic.error?.message);
      const draft: Payment = {
        id: pid(),
        academy_id: academyId,
        student_id: input.student_id,
        group_id: input.group_id ?? null,
        month: input.month,
        month_year: input.month,
        fee_type: input.fee_type ?? "monthly",
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
      const { remaining: _r, ...paymentPersist } = payment;
      await persistInsert("payments", paymentPersist, authenticatedAcademyId);
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
    const createdPayment = derivePayment(atomic.data as Payment);
    if (input.fee_type && createdPayment.id) {
      await persistUpdate("payments", createdPayment.id, { fee_type: input.fee_type }, academyId);
      createdPayment.fee_type = input.fee_type;
    }
    return { ok: true, payment: attach(createdPayment) };
  }
  const draft: Payment = {
    id: pid(),
    academy_id: academyId,
    student_id: input.student_id,
    group_id: input.group_id ?? null,
    month: input.month,
    month_year: input.month,
    fee_type: input.fee_type ?? "monthly",
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
  await persistInsert("payments", paymentPersist, authenticatedAcademyId);
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
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const atomic = await runAtomicPaymentRpc({
      academyId: authenticatedAcademyId,
      paymentId,
      studentId: p.student_id,
      groupId: p.group_id,
      month: p.month_year ?? p.month,
      amountDue: p.amount_due,
      amountPaid: amount,
      method,
      notes: note ?? p.notes,
    });
    if (atomic.error || !atomic.data) {
      return { ok: false, error: atomic.error?.message ?? "Could not record payment." };
    }
    return { ok: true, payment: attach(derivePayment(atomic.data as Payment)) };
  }
  p.amount_paid = newPaid;
  p.payment_date = now;
  p.method = method;
  p.notes = note ?? p.notes;
  p.status = derivePayment(p).status;
  p.updated_at = now;
  await persistUpdate("payments", paymentId, {
    amount_paid: p.amount_paid, payment_date: now, method, status: p.status,
    notes: note ?? p.notes, updated_at: now,
  }, authenticatedAcademyId);
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
