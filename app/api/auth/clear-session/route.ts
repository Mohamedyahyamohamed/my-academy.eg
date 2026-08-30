import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ACADEMY_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ACTIVE_ACADEMY_COOKIE);

  // Supabase may split its auth session across multiple cookies.
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
  }

  const next = request.nextUrl.searchParams.get("next") || "/login";
  const destination = new URL(next, request.url);
  return NextResponse.redirect(destination);
}
