import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { hasAllowedExtension, isWithinUploadLimit } from "@/lib/upload-policy";

const validToken = (token: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
const allowedMime = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request, context: { params: Promise<{ token: string; homeworkId: string }> }) {
  const { token, homeworkId } = await context.params;
  if (!validToken(token)) return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 404 });
  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  const { data: student } = await client.from("students").select("id,academy_id").eq("access_token", token).eq("is_active", true).neq("status", "ARCHIVED").maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: "Invalid portal link." }, { status: 404 });
  const { data: homework } = await client.from("homework").select("id,academy_id,group_id,deadline").eq("id", homeworkId).eq("academy_id", student.academy_id).maybeSingle();
  if (!homework) return NextResponse.json({ ok: false, error: "Homework not found." }, { status: 404 });
  const { data: membership } = await client.from("group_students").select("group_id").eq("student_id", student.id).eq("group_id", homework.group_id).maybeSingle();
  if (!membership) return NextResponse.json({ ok: false, error: "Homework is outside your enrolled groups." }, { status: 403 });
  if (homework.deadline && new Date(homework.deadline).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "The homework deadline has passed." }, { status: 400 });
  }
  const form = await request.formData();
  const content = String(form.get("content") ?? "").trim().slice(0, 5000);
  const file = form.get("file");
  if (!content && !(file instanceof File)) return NextResponse.json({ ok: false, error: "Add a response or attachment." }, { status: 400 });
  let fileId: string | null = null;
  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!isWithinUploadLimit(file.size, "homework") || !allowedMime.has(file.type) || !hasAllowedExtension(file.name, "homework")) {
      return NextResponse.json({ ok: false, error: "Attachment must be a PDF or image up to 10 MiB." }, { status: 413 });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    fileId = crypto.randomUUID();
    storagePath = `${student.academy_id}/${homework.id}/${student.id}/${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await client.storage.from("homework").upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ ok: false, error: "Could not upload the attachment." }, { status: 500 });
    const { error: fileError } = await client.from("files").insert({ id: fileId, academy_id: student.academy_id, owner_id: student.id, name: file.name.slice(0, 180), url: storagePath, size: file.size, mime_type: file.type });
    if (fileError) {
      await client.storage.from("homework").remove([storagePath]);
      return NextResponse.json({ ok: false, error: "Could not register the attachment." }, { status: 500 });
    }
  }
  const { data: existing } = await client.from("homework_submissions").select("id").eq("homework_id", homework.id).eq("student_id", student.id).maybeSingle();
  const payload = { content: content || null, file_id: fileId, file_url: null, status: "SUBMITTED", submitted_at: new Date().toISOString(), reviewed_at: null };
  const result = existing?.id
    ? await client.from("homework_submissions").update(payload).eq("id", existing.id).select("id").maybeSingle()
    : await client.from("homework_submissions").insert({ id: crypto.randomUUID(), homework_id: homework.id, student_id: student.id, ...payload }).select("id").maybeSingle();
  if (result.error) {
    if (storagePath) await client.storage.from("homework").remove([storagePath]);
    if (fileId) await client.from("files").delete().eq("id", fileId).eq("academy_id", student.academy_id);
    return NextResponse.json({ ok: false, error: "Could not save the submission." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, submissionId: result.data?.id ?? existing?.id ?? null });
}
