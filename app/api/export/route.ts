import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Export all academy data as JSON (data portability — right to export). */
export async function GET() {
  const user = requireRole("ADMIN");

  try {
    const client = createServerSupabaseClient();

    const tables = [
      "students", "parents", "teachers", "courses", "groups", "group_students",
      "lessons", "attendance", "payments", "payment_transactions", "exams",
      "grades", "homework", "homework_submissions", "notifications", "notes",
    ];

    const data: Record<string, any> = { _exportedAt: new Date().toISOString(), _academyId: user.academy_id };

    for (const table of tables) {
      try {
        const { data: rows } = await client.from(table).select("*");
        data[table] = rows ?? [];
      } catch {
        data[table] = [];
      }
    }

    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-academy-export-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
