import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { loadCurrentUser } from "@/services";

export const dynamic = "force-dynamic";

const FIXTURE_NAME = "Academy B Test Group";
const PROBE_NAME = "MYACADEMY_CROSS_TENANT_PROBE_NO_MUTATION";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProbeOperation = "update" | "delete";

/**
 * QA-only, non-open mutation probe. It can target only the synthetic Academy B
 * fixture and performs the mutation through the caller's authenticated RLS
 * client. The route never uses the service-role client for the mutation.
 */
export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user || !user.academy_id) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "TEACHER") {
    return NextResponse.json({ ok: false, error: "Teacher session required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const operation = body?.operation as ProbeOperation;
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if ((operation !== "update" && operation !== "delete") || !UUID_RE.test(targetId)) {
    return NextResponse.json({ ok: false, error: "Invalid probe operation or targetId." }, { status: 400 });
  }
  if (body?.fixtureName !== FIXTURE_NAME) {
    return NextResponse.json({ ok: false, error: "Synthetic fixture marker required." }, { status: 400 });
  }

  const admin = nodeSupabaseClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Probe is not configured." }, { status: 503 });
  }

  // Inspect only to confirm that the requested id is the exact synthetic
  // Academy B fixture. Do not return its academy id or any other metadata.
  const { data: fixture, error: fixtureError } = await admin
    .from("groups")
    .select("id, academy_id, name")
    .eq("id", targetId)
    .eq("name", FIXTURE_NAME)
    .maybeSingle();
  if (fixtureError || !fixture || fixture.academy_id === user.academy_id) {
    return NextResponse.json({ ok: false, error: "Synthetic Academy B fixture not found." }, { status: 404 });
  }

  const client = await createServerSupabaseClient();
  const mutation = operation === "update"
    ? client.from("groups").update({ name: PROBE_NAME }).eq("id", targetId).select("id")
    : client.from("groups").delete().eq("id", targetId).select("id");
  const { data, error } = await mutation;
  const returnedRows = Array.isArray(data) ? data.length : 0;
  const denied = Boolean(error) || returnedRows === 0;

  // A PostgREST RLS policy can reject with an error or hide the row and return
  // zero affected rows. Normalize both safe outcomes to an explicit 403.
  if (denied) {
    return NextResponse.json({
      ok: true,
      operation,
      denied: true,
      mutationApplied: false,
      returnedRows,
      rlsErrorCode: error?.code ?? null,
    }, { status: 403 });
  }

  console.error("Tenant isolation probe unexpectedly mutated a synthetic target", {
    operation,
    targetId,
  });
  return NextResponse.json({
    ok: false,
    operation,
    denied: false,
    mutationApplied: true,
    returnedRows,
  }, { status: 500 });
}
