"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  UsersRound,
  Users,
  QrCode,
  CalendarPlus,
  ClipboardCheck,
  GraduationCap,
  Rocket,
} from "lucide-react";
import { useClientLang } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

/**
 * Progressive onboarding checklist for a newly-created academy.
 * Surfaces the six first-win steps the operator needs, with live progress
 * computed from actual academy data so completed steps stay checked.
 */
export function OnboardingChecklist({
  academyId,
  groupCount,
  studentCount,
  lessonCount,
  attendanceCount,
  gradeCount,
  qrCount,
}: {
  academyId: string;
  groupCount: number;
  studentCount: number;
  lessonCount: number;
  attendanceCount: number;
  gradeCount: number;
  qrCount: number;
}) {
  const lang = useClientLang();
  const en = lang === "en";

  const items: ChecklistItem[] = [
    {
      key: "group",
      label: en ? "Create your first group" : "أنشئ أول مجموعة",
      href: "/groups",
      done: groupCount > 0,
    },
    {
      key: "students",
      label: en ? "Add your first students" : "أضف أول طلاب",
      href: "/students",
      done: studentCount > 0,
    },
    {
      key: "qr",
      label: en ? "Print student QR cards" : "اطبع بطاقات QR للطلاب",
      href: "/students",
      done: qrCount > 0,
    },
    {
      key: "lesson",
      label: en ? "Schedule your first lesson" : "أنشئ أول حصة",
      href: "/lessons",
      done: lessonCount > 0,
    },
    {
      key: "attendance",
      label: en ? "Record your first attendance" : "سجّل أول حضور",
      href: "/attendance",
      done: attendanceCount > 0,
    },
    {
      key: "grade",
      label: en ? "Add your first assessment" : "أضف أول تقييم",
      href: "/grades",
      done: gradeCount > 0,
    },
  ];

  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const allDone = done === items.length;

  // Hide the card once the academy is fully onboarded.
  if (allDone) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-l from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-5 w-5 text-primary" />
          {en ? "Getting started" : "دليل البداية"}
          <Badge variant="secondary" className="ms-auto">
            {done}/{items.length}
          </Badge>
        </CardTitle>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => {
          const Icon =
            item.key === "group"
              ? UsersRound
              : item.key === "students"
                ? Users
                : item.key === "qr"
                  ? QrCode
                  : item.key === "lesson"
                    ? CalendarPlus
                    : item.key === "attendance"
                      ? ClipboardCheck
                      : GraduationCap;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                item.done
                  ? "text-muted-foreground hover:bg-accent/40"
                  : "font-medium text-foreground hover:bg-accent",
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={item.done ? "line-through" : ""}>{item.label}</span>
              {!item.done && (
                <span className="ms-auto text-xs text-primary">{en ? "Do it →" : "أنجزها ←"}</span>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

