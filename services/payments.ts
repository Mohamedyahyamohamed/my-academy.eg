/**
 * Payments service.
 * Enforces: no negative amounts, no invalid student references,
 * automatic remaining + status computation.
 * Optimized for Serverless Environments & O(1) Lookups.
 */
import type { PaginatedResult, Payment, PaymentStatus } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "./supabase/config";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { derivePayment, getGroup, getParent, byAcademy, fetchTableRLS } from "./_shared";
import { fullName } from "./_shared";

// ─── Timezone Helpers (Africa/Cairo) ────────────────────────────
function getCairoTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); // YYYY-MM-DD
}

function getCairoMonthKey() {
  return getCairoTodayKey().slice(0, 7); // YYYY-MM
}

function getCairoDateObj() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
}
// ─────────────────────────────────────────────────────────────────

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
  
  let items = (await fetchTableRLS<Payment & { deleted_at?: string }>("payments", authenticatedAcademyId))
    .filter((p) => !p.deleted_at)
    .map(derivePayment);

  if (status !== "ALL") items = items.filter((p) => p.status === status);
  if (month !== "ALL") items = items.filter((p) => (p.month_year ?? p.month) === month);
  if (groupId !== "ALL") items = items.filter((p) => p.group_id === groupId);
  if (studentId !== "ALL") items = items.filter((p) => p.student_id === studentId);
  
  if (search.trim()) {
    const q = search.toLowerCase();
    // تحسين الأداء: بناء Map للطلاب بدلاً من البحث داخل المصفوفة في كل لفة (O(1) بدل O(N^2))
    const studentsMap = new Map(collections().students.map(s => [s.id, fullName(s).toLowerCase()]));
    items = items.filter((p) => {
      const studentName = studentsMap.get(p.student_id);
      return studentName && studentName.includes(q);
    });
  }

  items.sort((a, b) => {
    const aMonth = a.month_year ?? a.month;
    const bMonth = b.month_year ?? b.month;
    if (aMonth === bMonth) {
      return (b.amount_due - b.amount_paid) - (a.amount_due - a.amount_paid);
    }
    return aMonth < bMonth ? 1 : -1;
  });

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
  const client = nodeSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from("students")
      .select("id, academy_id")
      .eq("id", id)
      .eq("academy_id", academyId)
      .maybeSingle();
    if (error) {
      console.error("Unable to validate payment student:", error.message);
      return false;
    }
    return Boolean(data);
  }
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
    return { data: null, error: err instanceof Error ? err : new Error("record_payment_atomic failed") };
  }
}

export async function createPayment(input: CreatePaymentInput, academyIdOverride?: string): Promise<{
  ok: boolean;
  error?: string;
  payment?: Payment;
}> {
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

  const nowUTC = new Date().toISOString(); // For database strict timestamps
  const todayCairo = getCairoTodayKey();   // For logic bounds like due_date
  
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
    
    if (!atomic.error && atomic.data) {
      const createdPayment = derivePayment(atomic.data as Payment);
      if (input.fee_type && createdPayment.id) {
        await persistUpdate("payments", createdPayment.id, { fee_type: input.fee_type }, academyId);
        createdPayment.fee_type = input.fee_type;
      }
      return { ok: true, payment: attach(createdPayment) };
    }
    
    console.warn("record_payment_atomic failed, falling back to direct insert:", atomic.error?.message);
  }

  // Fallback Logic (DRY) - يُنفذ في حالة الفشل أو إذا كان Supabase غير مفعل
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
    due_date: input.due_date ?? todayCairo,
    payment_date: (input.amount_paid ?? 0) > 0 ? nowUTC : null,
    method: input.method ?? null,
    status: "UNPAID",
    notes: input.notes ?? null,
    created_at: nowUTC,
    updated_at: nowUTC,
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
      paid_at: nowUTC,
      note: null,
    };
    await persistInsert("payment_transactions", tx);
    collections().transactions.push(tx);
  }
  
  return { ok: true, payment: attach(payment) };
}

export async function recordPayment(
  paymentId: string,
  amount: number,
  method: string,
  note?: string,
  academyId?: string,
): Promise<{ ok: boolean; error?: string; payment?: Payment }> {
  const authenticatedAcademyId = currentAcademyId();
  if (!authenticatedAcademyId || (academyId && academyId !== authenticatedAcademyId)) 
    return { ok: false, error: "Payment academy scope mismatch." };
    
  const p = collections().payments.find((x) => x.id === paymentId && x.academy_id === authenticatedAcademyId);
  if (!p) return { ok: false, error: "Payment not found." };
  if (amount <= 0) return { ok: false, error: "Amount must be positive." };
  
  const newPaid = p.amount_paid + amount;
  if (newPaid > p.amount_due) return { ok: false, error: "Payment exceeds remaining balance." };
  
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
    amount_paid: p.amount_paid, 
    payment_date: now, 
    method, 
    status: p.status,
    notes: note ?? p.notes, 
    updated_at: now,
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
  const authenticatedAcademyId = currentAcademyId();
  if (!authenticatedAcademyId || (academyId && academyId !== authenticatedAcademyId)) return false;
  
  const p = collections().payments.find((x) => x.id === id && x.academy_id === authenticatedAcademyId);
  if (!p) return false;
  
  p.deleted_at = new Date().toISOString();
  // تم إضافة authenticatedAcademyId لدالة الحذف لضمان أمان الـ RLS
  await persistUpdate("payments", id, { deleted_at: p.deleted_at }, authenticatedAcademyId);
  
  collections().payments = collections().payments.filter((x) => x.id !== id);
  return true;
}

/* ---------------- Metrics ---------------- */

export interface PaymentMetrics {
  monthlyRevenue: number;
  collectedThisMonth: number;
  outstanding: number;
  collectedInRange: number;
  revenueByMonth: { month: string; revenue: number; collected: number }[];
}

export async function getPaymentMetrics(months = 6, academyId?: string): Promise<PaymentMetrics> {
  const authenticatedAcademyId = academyId ?? currentAcademyId();
  // تم تمرير الـ Academy ID بشكل صريح لضمان عدم حدوث تسريب في البيانات
  const pays = (await fetchTableRLS<Payment>("payments", authenticatedAcademyId)).map(derivePayment);
  
  const cm = getCairoMonthKey();
  const thisMonth = pays.filter((p) => p.month === cm);
  const monthlyRevenue = thisMonth.reduce((s, p) => s + p.amount_due, 0);
  const collectedThisMonth = thisMonth.reduce((s, p) => s + p.amount_paid, 0);
  const outstanding = pays.reduce((s, p) => s + p.remaining, 0);

  const byMonth = new Map<string, { revenue: number; collected: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = getCairoDateObj();
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
