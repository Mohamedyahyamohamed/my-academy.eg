import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ACADEMY_COOKIE, SESSION_COOKIE } from "@/lib/auth";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { loadCurrentUser } from "@/services/session";
import { createSignedSession, sessionMaxAgeSeconds } from "@/lib/session-cookie";
import type { AcademyMembership, SessionUser } from "@/types";

export async function POST(request: NextRequest) {
  const currentUser = await loadCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: "تبديل الأكاديمية غير متاح في وضع العرض." }, { status: 400 });

  const body = await request.json().catch(() => null) as { academyId?: string } | null;
  const academyId = body?.academyId?.trim();
  if (!academyId) return NextResponse.json({ ok: false, error: "اختر أكاديمية صالحة." }, { status: 400 });

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ ok: false, error: "تعذّر الاتصال بقاعدة البيانات." }, { status: 503 });

  const { data: membership, error: membershipError } = await client
    .from("academy_memberships")
    .select("id,academy_id,role,status,joined_at,academies(name,slug)")
    .eq("profile_id", currentUser.id)
    .eq("academy_id", academyId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (membershipError || !membership) {
    return NextResponse.json({ ok: false, error: "لا تملك عضوية نشطة في هذه الأكاديمية." }, { status: 403 });
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,full_name,avatar_url")
    .eq("id", currentUser.id)
    .single();
  if (profileError || !profile) return NextResponse.json({ ok: false, error: "تعذّر تحميل ملف الحساب." }, { status: 500 });

  const { data: memberships, error: membershipsError } = await client
    .from("academy_memberships")
    .select("id,academy_id,role,status,joined_at,academies(name,slug)")
    .eq("profile_id", currentUser.id)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: true })
    .limit(20);
  if (membershipsError || !memberships?.length) return NextResponse.json({ ok: false, error: "لا توجد عضويات نشطة." }, { status: 403 });

  const availableMemberships: AcademyMembership[] = memberships.map((item: any) => {
    const academy = Array.isArray(item.academies) ? item.academies[0] : item.academies;
    return {
      id: item.id,
      academy_id: item.academy_id,
      role: item.role,
      status: item.status,
      joined_at: item.joined_at,
      academy_name: academy?.name,
      academy_slug: academy?.slug,
    };
  });

  const user: SessionUser = {
    id: profile.id,
    email: profile.email,
    role: membership.role,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    academy_id: membership.academy_id,
    active_membership_id: membership.id,
    memberships: availableMemberships,
  };

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  };
  cookieStore.set(SESSION_COOKIE, createSignedSession(user), cookieOptions);
  cookieStore.set(ACTIVE_ACADEMY_COOKIE, academyId, cookieOptions);

  return NextResponse.json({ ok: true, user });
}
