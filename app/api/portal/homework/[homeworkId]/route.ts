import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { readPortalSession } from "@/lib/portal-session";
import { hasAllowedExtension, isWithinUploadLimit } from "@/lib/upload-policy";

const allowedMime = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request, context: { params: Promise<{ homeworkId: string }> }) {
  const session = await readPortalSession();
  if (!session) return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول إلى البوابة." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ ok: false, error: "ولي الأمر لا يمكنه إرسال الواجبات." }, { status: 403 });
  const { homeworkId } = await context.params;
  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ ok: false, error: "الخدمة غير متاحة." }, { status: 503 });
  const { data: student } = await client.from("students").select("id").eq("id", session.student_id).eq("academy_id", session.academy_id).eq("is_active", true).neq("status", "ARCHIVED").maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: "الحساب غير مفعّل." }, { status: 401 });

  const { data: homework } = await client.from("homework").select("id,academy_id,group_id,deadline").eq("id", homeworkId).eq("academy_id", session.academy_id).maybeSingle();
  if (!homework) return NextResponse.json({ ok: false, error: "الواجب غير موجود." }, { status: 404 });
  const { data: membership } = await client.from("group_students").select("group_id").eq("student_id", session.student_id).eq("group_id", homework.group_id).maybeSingle();
  if (!membership) return NextResponse.json({ ok: false, error: "الواجب خارج مجموعاتك." }, { status: 403 });
  if (homework.deadline && new Date(homework.deadline).getTime() < Date.now()) return NextResponse.json({ ok: false, error: "انتهى موعد تسليم الواجب." }, { status: 400 });

  const form = await request.formData();
  const content = String(form.get("content") ?? "").trim().slice(0, 5000);
  const file = form.get("file");
  if (!content && !(file instanceof File)) return NextResponse.json({ ok: false, error: "أضف إجابة أو مرفقًا." }, { status: 400 });
  let fileId: string | null = null;
  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!isWithinUploadLimit(file.size, "homework") || !allowedMime.has(file.type) || !hasAllowedExtension(file.name, "homework")) return NextResponse.json({ ok: false, error: "المرفق يجب أن يكون PDF أو صورة حتى 10 MiB." }, { status: 413 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    fileId = crypto.randomUUID();
    storagePath = `${session.academy_id}/${homework.id}/${session.student_id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from("homework").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ ok: false, error: "تعذر رفع المرفق." }, { status: 500 });
    const { error: fileError } = await client.from("files").insert({ id: fileId, academy_id: session.academy_id, owner_id: session.student_id, name: file.name.slice(0, 180), url: storagePath, size: file.size, mime_type: file.type });
    if (fileError) {
      await client.storage.from("homework").remove([storagePath]);
      return NextResponse.json({ ok: false, error: "تعذر تسجيل المرفق." }, { status: 500 });
    }
  }
  const { data: existing } = await client.from("homework_submissions").select("id,file_id").eq("homework_id", homework.id).eq("student_id", session.student_id).maybeSingle();
  const payload = { content: content || null, file_id: fileId, file_url: null, status: "SUBMITTED", submitted_at: new Date().toISOString(), reviewed_at: null };
  const result = existing?.id ? await client.from("homework_submissions").update(payload).eq("id", existing.id).select("id").maybeSingle() : await client.from("homework_submissions").insert({ id: crypto.randomUUID(), homework_id: homework.id, student_id: session.student_id, ...payload }).select("id").maybeSingle();
  if (result.error) {
    if (storagePath) await client.storage.from("homework").remove([storagePath]);
    if (fileId) await client.from("files").delete().eq("id", fileId).eq("academy_id", session.academy_id);
    return NextResponse.json({ ok: false, error: "تعذر حفظ التسليم." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, submissionId: result.data?.id ?? existing?.id ?? null });
}
