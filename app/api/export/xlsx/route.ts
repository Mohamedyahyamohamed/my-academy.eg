import { NextResponse } from "next/server";
import { loadCurrentUser } from "@/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { collections } from "@/services/data/store";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportType = "attendance" | "payments" | "reports";

/**
 * Academy-scoped Excel export for reports, attendance, and payments.
 * Mirrors the JSON export's scoping: only the caller's academy rows are
 * included, no secrets/PII beyond what the role already sees in-app.
 */
export async function GET(req: Request) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") as ExportType) || "reports";
  if (!["attendance", "payments", "reports"].includes(type)) {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  const academyId = user.academy_id;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MY Academy";
  workbook.created = new Date();

  if (type === "attendance") await buildAttendance(workbook, academyId);
  else if (type === "payments") await buildPayments(workbook, academyId);
  else await buildReports(workbook, academyId);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `my-academy-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const body = new Uint8Array(buffer as unknown as ArrayBuffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function loadRows(table: string, academyId: string, columns: string[]) {
  if (!isSupabaseConfigured()) {
    const local = (collections() as any)[table] ?? [];
    return local.filter((r: any) => r.academy_id === academyId).map((r: any) => {
      const out: Record<string, unknown> = {};
      for (const c of columns) out[c] = r[c];
      return out;
    });
  }
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from(table).select(columns.join(",")).eq("academy_id", academyId);
  if (error) return [];
  return (data ?? []) as unknown as Record<string, unknown>[];
}

async function buildAttendance(workbook: ExcelJS.Workbook, academyId: string) {
  const ws = workbook.addWorksheet("الحضور");
  ws.columns = [
    { header: "المجموعة", key: "group", width: 22 },
    { header: "الطالب", key: "student", width: 24 },
    { header: "الحصة", key: "lesson", width: 22 },
    { header: "التاريخ", key: "date", width: 16 },
    { header: "الحالة", key: "status", width: 14 },
  ];
  const groups = await loadRows("groups", academyId, ["id", "name"]);
  const students = await loadRows("students", academyId, ["id", "first_name", "last_name"]);
  const lessons = await loadRows("lessons", academyId, ["id", "title", "group_id", "lesson_date"]);
  const attendance = await loadRows("attendance", academyId, ["lesson_id", "student_id", "status", "recorded_at"]);
  const groupName = new Map(groups.map((g: any) => [g.id, g.name]));
  const studentName = new Map(students.map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()]));
  const lessonMap = new Map(lessons.map((l: any) => [l.id, l]));
  for (const a of attendance) {
    const lesson: any = lessonMap.get(a.lesson_id) ?? {};
    ws.addRow({
      group: groupName.get(lesson.group_id) ?? "",
      student: studentName.get(a.student_id) ?? "",
      lesson: lesson.title ?? "",
      date: (a.recorded_at ?? lesson.lesson_date ?? "").toString().slice(0, 10),
      status: a.status ?? "",
    });
  }
  styleHeader(ws);
}

async function buildPayments(workbook: ExcelJS.Workbook, academyId: string) {
  const ws = workbook.addWorksheet("المدفوعات");
  ws.columns = [
    { header: "الطالب", key: "student", width: 24 },
    { header: "الشهر", key: "month", width: 14 },
    { header: "المبلغ المستحق", key: "due", width: 16 },
    { header: "المبلغ المدفوع", key: "paid", width: 16 },
    { header: "المتبقي", key: "remaining", width: 14 },
    { header: "الحالة", key: "status", width: 14 },
  ];
  const students = await loadRows("students", academyId, ["id", "first_name", "last_name"]);
  const payments = await loadRows("payments", academyId, ["student_id", "month", "amount_due", "amount_paid", "remaining", "status"]);
  const studentName = new Map(students.map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()]));
  for (const p of payments) {
    ws.addRow({
      student: studentName.get(p.student_id) ?? "",
      month: (p.month ?? "").toString(),
      due: p.amount_due ?? 0,
      paid: p.amount_paid ?? 0,
      remaining: p.remaining ?? 0,
      status: p.status ?? "",
    });
  }
  styleHeader(ws);
}

async function buildReports(workbook: ExcelJS.Workbook, academyId: string) {
  const ws = workbook.addWorksheet("تقرير الطلاب");
  ws.columns = [
    { header: "الطالب", key: "student", width: 24 },
    { header: "المجموعة", key: "group", width: 22 },
    { header: "البريد", key: "email", width: 26 },
    { header: "ولي الأمر", key: "parent", width: 24 },
    { header: "الهاتف", key: "phone", width: 16 },
  ];
  const students = await loadRows("students", academyId, ["id", "first_name", "last_name", "email", "group_id", "parent_name", "parent_phone"]);
  const groups = await loadRows("groups", academyId, ["id", "name"]);
  const groupName = new Map(groups.map((g: any) => [g.id, g.name]));
  for (const s of students) {
    ws.addRow({
      student: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
      group: groupName.get(s.group_id) ?? "",
      email: s.email ?? "",
      parent: s.parent_name ?? "",
      phone: s.parent_phone ?? "",
    });
  }
  styleHeader(ws);
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "solid", fgColor: { argb: "FF071A2E" } } as unknown as ExcelJS.Fill;
  header.alignment = { readingOrder: 2 } as unknown as ExcelJS.Alignment;
  ws.views = [{ rightToLeft: true }];
}
