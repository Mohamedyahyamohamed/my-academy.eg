"use client";

import * as React from "react";
import type { AcademyMembership } from "@/types";

interface AcademySwitcherProps {
  currentAcademyId: string;
  memberships?: AcademyMembership[];
}

export function AcademySwitcher({ currentAcademyId, memberships = [] }: AcademySwitcherProps) {
  const [pending, setPending] = React.useState(false);
  if (memberships.length < 2) return null;

  async function switchAcademy(academyId: string) {
    if (!academyId || academyId === currentAcademyId || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/account/switch-academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "تعذّر تبديل الأكاديمية.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "تعذّر تبديل الأكاديمية.");
      setPending(false);
    }
  }

  return (
    <label className="flex min-w-[150px] items-center gap-2 rounded-lg border border-border bg-background/80 px-2 py-1.5 text-xs">
      <span className="whitespace-nowrap text-muted-foreground">الأكاديمية</span>
      <select
        aria-label="اختيار الأكاديمية النشطة"
        value={currentAcademyId}
        disabled={pending}
        onChange={(event) => void switchAcademy(event.target.value)}
        className="min-w-0 flex-1 bg-transparent font-medium outline-none"
      >
        {memberships.map((membership) => (
          <option key={membership.academy_id} value={membership.academy_id}>
            {membership.academy_name || "أكاديمية بدون اسم"}
          </option>
        ))}
      </select>
    </label>
  );
}
