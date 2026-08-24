import { NextResponse } from "next/server";
import { readPortalSession } from "@/lib/portal-session";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await readPortalSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول إلى البوابة." }, { status: 401 });
  const { fileId } = await params;
  const client = nodeSupabaseClient();
  if (!client || !fileId) return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
  const { data: student } = await client.from("students").select("id").eq("id", session.student_id).eq("academy_id", session.academy_id).eq("is_active", true).neq("status", "ARCHIVED").maybeSingle();
  if (!student) return NextResponse.json({ error: "الحساب غير مفعّل." }, { status: 401 });

  const { data: file } = await client.from("content_files").select("id,academy_id,course_id,name,mime_type,storage_path").eq("id", fileId).eq("academy_id", session.academy_id).maybeSingle();
  if (!file) return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
  const { data: course } = await client.from("content_courses").select("group_id").eq("id", file.course_id).eq("academy_id", session.academy_id).eq("is_published", true).maybeSingle();
  if (!course) return NextResponse.json({ error: "الملف غير متاح." }, { status: 404 });
  const { data: membership } = await client.from("group_students").select("group_id").eq("student_id", session.student_id).eq("group_id", course.group_id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "الملف خارج مجموعاتك." }, { status: 403 });

  const signed = await client.storage.from("content").createSignedUrl(file.storage_path, 60);
  if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: "الملف غير متاح." }, { status: 404 });
  const upstream = await fetch(signed.data.signedUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "الملف غير متاح." }, { status: 404 });
  const safeName = String(file.name).replace(/[\\"\r\n]/g, "_");
  const headers = new Headers({ "Content-Type": file.mime_type || "application/octet-stream", "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" });
  return new NextResponse(upstream.body, { status: 200, headers });
}
