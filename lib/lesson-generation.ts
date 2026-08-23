import type { Lesson } from "@/types";
import { parseSchedule } from "@/lib/utils";

export function buildRecurringLessonRows(
  group: { id: string; name: string; teacher_id: string; schedule?: string | null },
  academyId: string,
  weeks = 12,
  now = new Date(),
): Lesson[] {
  const schedule = parseSchedule(group.schedule);
  if (!schedule?.days.length) return [];

  const dayIndexes: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const wantedDays = new Set(schedule.days.map((day) => dayIndexes[day]).filter((day) => day !== undefined));
  if (!wantedDays.size) return [];

  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const rows: Lesson[] = [];
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + offset);
    if (!wantedDays.has(date.getUTCDay())) continue;

    const timestamp = new Date().toISOString();
    rows.push({
      id: crypto.randomUUID(),
      status: "scheduled",
      is_cancelled: false,
      cancellation_reason: null,
      academy_id: academyId,
      group_id: group.id,
      teacher_id: group.teacher_id,
      date: date.toISOString().slice(0, 10),
      start_time: schedule.start,
      end_time: schedule.end,
      topic: group.name,
      description: "Automatically generated from the group's weekly schedule.",
      notes: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  return rows;
}
