import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  MiscService,
  resolveParent,
  resolveStudent,
  getMyChildren,
} from "@/services";

export async function GET(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  // Rate limit search.
  const { rateLimit, LIMITS } = await import("@/lib/rate-limit-redis");
  const rl = await rateLimit(`search:${user.id}`, LIMITS.search.max, LIMITS.search.window);
  if (!rl.allowed) return NextResponse.json({ results: [] }, { status: 429 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

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
