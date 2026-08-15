import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/services/supabase/config";
import { notifyStudentQrWhatsApp } from "@/services/whatsapp";

export const runtime = "nodejs";

/**
 * Send the authenticated student's own QR through the configured WhatsApp
 * provider. The endpoint never accepts an arbitrary student id, so a student
 * cannot use it to send another student's QR.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!token || !url || !anonKey) {
    return NextResponse.json({ ok: false, error: "Authentication is required." }, { status: 401 });
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Invalid authentication." }, { status: 401 });
  }

  const adminClient = nodeSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: "WhatsApp service is unavailable." }, { status: 503 });
  }

  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id,profile_id,consent_given")
    .eq("profile_id", authData.user.id)
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ ok: false, error: "Student record could not be loaded." }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json({ ok: false, error: "No student record is linked to this account." }, { status: 404 });
  }
  if (student.consent_given !== true) {
    return NextResponse.json({ ok: false, error: "WhatsApp consent is required." }, { status: 403 });
  }

  await notifyStudentQrWhatsApp(student.id, false);
  return NextResponse.json({ ok: true, student_id: student.id });
}
