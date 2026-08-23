import { beforeEach, describe, expect, it } from "vitest";
import { db, collections } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { createPayment, recordPayment, listPayments } from "@/services/payments";

const A_USER = {
  id: "prof-admin",
  email: "admin@myacademy.edu",
  role: "ADMIN",
  full_name: "Academy A Admin",
  academy_id: "academy-1",
} as any;

beforeEach(() => {
  db.data = createSeedData();
  setRequestContext(A_USER);
});

describe("financial tracking", () => {
  it("creates a current-month payment and derives partial status", async () => {
    const result = await createPayment({
      student_id: "student-1",
      group_id: "group-1",
      month: "2099-08",
      amount_due: 1200,
      amount_paid: 300,
      method: "Cash",
      notes: "First installment",
    }, "academy-1");

    expect(result.ok).toBe(true);
    expect(result.payment?.month).toBe("2099-08");
    expect(result.payment?.status).toBe("PARTIAL");
    expect(result.payment?.remaining).toBe(900);
  });

  it("records a second installment without creating a duplicate month row", async () => {
    const created = await createPayment({
      student_id: "student-1",
      group_id: "group-1",
      month: "2099-09",
      amount_due: 1200,
      amount_paid: 300,
      method: "Cash",
    }, "academy-1");
    expect(created.ok && created.payment).toBeTruthy();

    const recorded = await recordPayment(created.payment!.id, 900, "Cash", "Paid in full", "academy-1");
    expect(recorded.ok).toBe(true);
    expect(recorded.payment?.status).toBe("PAID");
    expect(recorded.payment?.amount_paid).toBe(1200);

    const monthRows = collections().payments.filter((payment) => payment.student_id === "student-1" && payment.group_id === "group-1" && payment.month === "2099-09");
    expect(monthRows).toHaveLength(1);
  });

  it("rejects a student/group relationship from another academy", async () => {
    const result = await createPayment({
      student_id: "7946a8cf-2497-4614-820e-6e2603d1f3fa",
      group_id: "fa7c6506-e822-480a-9d5b-eabe6effb097",
      month: "2099-10",
      amount_due: 100,
      amount_paid: 50,
    }, "academy-1");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/student|invalid|academy/i);
  });

  it("filters by the canonical month value", async () => {
    const result = await listPayments({ month: "2026-08", pageSize: 50 }, "academy-1");
    expect(result.items.every((payment) => (payment.month_year ?? payment.month) === "2026-08")).toBe(true);
  });
});
