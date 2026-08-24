import { NextRequest, NextResponse } from "next/server";
import {
  loadCurrentUser,
  MiscService,
  resolveParent,
  resolveStudent,
  getMyChildren,
} from "@/services";
import { ensureStoreLoaded } from "@/services/data/store";
import { setRequestContext } from "@/services/request-context";

export async function GET(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  // API routes can cross an async boundary before tenant-scoped service reads.
  // Hydrate and re-bind the authenticated academy explicitly so globalSearch
  // cannot fail closed with a missing context or read another tenant.
  await ensureStoreLoaded(user.academy_id);
  setRequestContext(user);

  // Rate limit search.
  const { rateLimit, LIMITS } = await import("@/lib/rate-limit-redis");
  const rl = await rateLimit(`search:${user.id}`, LIMITS.search.max, LIMITS.search.window);
  if (!rl.allowed) return NextResponse.json({ results: [] }, { status: 429 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

  // SUPER_ADMIN: search academies and platform users (cross-tenant, read-only).
  if (user.role === "SUPER_ADMIN") {
    const query = q.trim().toLowerCase();
    if (!query) return NextResponse.json({ results: [] });
    const results: { type: "academy" | "user"; id: string; label: string; subtitle: string; href: string }[] = [];
    try {
      const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
      const sb = nodeSupabaseClient();
      const [academies, users] = await Promise.all([
        sb.from("academies").select("id, name").ilike("name", `%${query}%`).limit(5),
        sb.from("profiles").select("id, full_name, email, role").or(`full_name.ilike.%${query}%,email.ilike.%${query}%`).limit(5),
      ]);
      for (const a of academies.data ?? []) {
        results.push({ type: "academy", id: a.id, label: a.name, subtitle: "أكاديمية", href: `/platform?academy=${a.id}` });
      }
      for (const u of users.data ?? []) {
        results.push({ type: "user", id: u.id, label: u.full_name, subtitle: u.email, href: `/platform?tab=users&user=${u.id}` });
      }
    } catch {
      // fail closed with empty results
    }
    return NextResponse.json({ results });
  }

  // ADMIN/TEACHER: academy-wide search.
  if (user.role === "ADMIN" || user.role === "TEACHER") {
    return NextResponse.json({ results: MiscService.globalSearch(q) });
  }

  // PARENT: only their own children.
  if (user.role === "PARENT") {
    const children = getMyChildren(user);
    const query = q.toLowerCase();
    const results = children
      .filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(query))
      .map((c) => ({
        type: "student" as const,
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        subtitle: c.grade ?? "My child",
        href: `/parent/children/${c.id}`,
      }));
    return NextResponse.json({ results });
  }

  // STUDENT: only themselves.
  const student = resolveStudent(user);
  if (!student) return NextResponse.json({ results: [] });
  const query = q.toLowerCase();
  const me = `${student.first_name} ${student.last_name}`;
  const results = me.toLowerCase().includes(query)
    ? [{
        type: "student" as const,
        id: student.id,
        label: me,
        subtitle: "My profile",
        href: "/student",
      }]
    : [];
  return NextResponse.json({ results });
}
