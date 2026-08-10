import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/services";
import { createQrSession } from "@/lib/qr-session";

/** Generate a signed, short-lived QR session token for a lesson. */
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
  const session = createQrSession(lessonId);
  return NextResponse.json(session);
}
