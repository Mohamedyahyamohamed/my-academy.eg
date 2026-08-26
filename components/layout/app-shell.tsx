"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { navForRole } from "@/lib/nav";
import type { SessionUser } from "@/types";

interface AppShellProps {
  user: SessionUser;
  academyName: string;
  children: React.ReactNode;
}

/** Unified application shell — computes role-based nav on the client. */
export function AppShell({ user, academyName, children }: AppShellProps) {
  const sections = navForRole(user.role, user.is_assistant === true);
  const roleAccent = user.role === "TEACHER" ? "from-sky-500/10" : user.role === "PARENT" ? "from-emerald-500/10" : user.role === "STUDENT" ? "from-violet-500/10" : "from-primary/10";
  return (
    <div className={`print-app-shell flex h-screen overflow-hidden bg-gradient-to-br ${roleAccent} via-transparent to-background`}>
      <Sidebar sections={sections} academyName={academyName} role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} sections={sections} />
        <main className="print-area flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
