"use client";

import * as React from "react";
import { useClientLang } from "@/lib/i18n-client";
import { formatClockTime, formatTimeRange } from "@/lib/utils";

export function CalendarView({ lessons }: { lessons: any[] }) {
  const en = useClientLang() === "en";
  const days = en ? ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] : ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const hours = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

  const dayIndex = (dateStr: string) => {
    const d = new Date(dateStr);
    let day = d.getDay();
    return day === 6 ? 0 : day + 1;
  };

  const colors = ["bg-blue-100 border-blue-400 text-blue-800", "bg-green-100 border-green-400 text-green-800", "bg-purple-100 border-purple-400 text-purple-800", "bg-orange-100 border-orange-400 text-orange-800", "bg-pink-100 border-pink-400 text-pink-800", "bg-cyan-100 border-cyan-400 text-cyan-800"];
  const courseColors: Record<string, string> = {};
  let colorIdx = 0;

  return (
    <div className="overflow-x-auto" dir={en ? "ltr" : "rtl"}>
      <div className="min-w-[800px]">
        {/* رأس الأيام */}
        <div className="grid grid-cols-8 gap-1 border-b border-border pb-2">
          <div className="w-16"></div>
          {days.map((d) => (
            <div key={d} className="text-center text-sm font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* الصفوف (ساعات) */}
        {hours.map((h, hi) => (
          <div key={h} className="grid grid-cols-8 gap-1 border-b border-border/50 py-1">
            <div className="w-16 text-xs text-muted-foreground">{formatClockTime(h, en ? "en-EG" : "ar-EG")}</div>
            {days.map((_, di) => {
              const cellLessons = lessons.filter((l) => {
                if (!l.date) return false;
                return dayIndex(l.date) === di && Number.parseInt(l.start_time?.split(":")[0] ?? "-1", 10) === hi + 9;
              });
              return (
                <div key={di} className="min-h-[40px] rounded-md p-0.5">
                  {cellLessons.map((l) => {
                    const courseName = l.group?.name?.split(" — ")[0] ?? l.topic ?? (en ? "Lesson" : "حصة");
                    if (!courseColors[courseName]) {
                      courseColors[courseName] = colors[colorIdx % colors.length];
                      colorIdx++;
                    }
                    return (
                      <div key={l.id} className={`mb-0.5 rounded border px-1.5 py-1 text-xs ${courseColors[courseName]}`}>
                        <p className="truncate font-medium">{courseName}</p>
                        <p className="truncate text-[10px] opacity-70">{formatTimeRange(l.start_time, l.end_time, en ? "en-EG" : "ar-EG")}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
        {/* مفتاح الألوان */}
        {Object.keys(courseColors).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(courseColors).map(([course, color]) => (
              <div key={course} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded border ${color}`}></span>
                <span className="text-xs text-muted-foreground">{course}</span>
              </div>
            ))}
          </div>
        )}
        {lessons.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">{en ? "No lessons scheduled." : "مفيش حصص مجدولة."}</p>
        )}
      </div>
    </div>
  );
}
