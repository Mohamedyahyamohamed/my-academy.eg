"use server";
import { audit } from "@/services/audit";

import { requireRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";

/** Upload a homework attachment using the service role (bypasses storage RLS). */
export async function uploadHomeworkFile(formData: FormData) {
  const user = requireRole("STUDENT", "ADMIN", "TEACHER");

  // Rate limit uploads.
  const rl = await rateLimit(`upload:${user.id}`, LIMITS.upload.max, LIMITS.upload.window);
  if (!rl.allowed) return { ok: false, error: "Too many uploads. Please slow down." };
  const file = formData.get("file") as File;
  const homeworkId = (formData.get("homeworkId") as string) || "misc";
  const studentId = (formData.get("studentId") as string) || "misc";
  if (!file) return { ok: false, error: "No file provided." };
  void audit({ action: "upload.attempt" });
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "File too large (max 10MB)." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage not configured." };

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${homeworkId}/${studentId}/${crypto.randomUUID()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await client.storage
    .from("homework")
    .upload(path, arrayBuffer, { contentType: file.type || "application/octet-stream", upsert: true });
  if (error) return { ok: false, error: error.message };

  const { data } = client.storage.from("homework").getPublicUrl(path);
  // Generate a signed URL (expires in 1 hour) for private access.
  let url = data.publicUrl;
  try {
    const signed = await client.storage.from("homework").createSignedUrl(path, 3600);
    if (signed.data?.signedUrl) url = signed.data.signedUrl;
  } catch {}
  return { ok: true, url, name: file.name };
}

// Audit all actions in this file.
