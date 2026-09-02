import { NextRequest, NextResponse } from "next/server";
import { getRequestId, setRequestContext } from "@/services/request-context";
import { newRequestId } from "@/lib/error-trace";

/** Lightweight liveness check. Dependency/readiness checks belong elsewhere. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || newRequestId();
  setRequestContext(null, { requestId, path: "/api/health" });
  const timestamp = new Date().toISOString();
  return NextResponse.json(
    {
      status: "healthy",
      request_id: getRequestId() ?? requestId,
      path: "/api/health",
      checks: { app: "ok" },
      timestamp,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
