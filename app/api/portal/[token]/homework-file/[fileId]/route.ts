import { NextResponse } from "next/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

const validToken = (token: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);

export async function GET(request: Request, context: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await context.params;
  if (!validToken(token)) return new NextResponse("Not found", { status: 404 });
  const client = nodeSupabaseClient();
  if (!client) return new NextResponse("Service unavailable", { status: 503 });
  const { data: student } = await client.from("students").select("id,academy_id").eq("access_token", token).eq("is_active", true).neq("status", "ARCHIVED").maybeSingle();
  if (!student) return new NextResponse("Not found", { status: 404 });
  const { data: submission } = await client.from("homework_submissions").select("homework_id,student_id").eq("file_id", fileId).eq("student_id", student.id).maybeSingle();
  if (!submission) return new NextResponse("Not found", { status: 404 });
  const { data: homework } = await client.from("homework").select("id,academy_id,group_id").eq("id", submission.homework_id).eq("academy_id", student.academy_id).maybeSingle();
  if (!homework) return new NextResponse("Not found", { status: 404 });
  const { data: membership } = await client.from("group_students").select("group_id").eq("student_id", student.id).eq("group_id", homework.group_id).maybeSingle();
  if (!membership) return new NextResponse("Not found", { status: 404 });
  const { data: file } = await client.from("files").select("url").eq("id", fileId).eq("academy_id", student.academy_id).maybeSingle();
  if (!file?.url || String(file.url).includes("..")) return new NextResponse("Not found", { status: 404 });
  const { data: signed, error } = await client.storage.from("homework").createSignedUrl(file.url, 60);
  if (error || !signed?.signedUrl) return new NextResponse("File unavailable", { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
