import type { Lesson } from "@/types";

const ACADEMY_TIMEZONE = "Africa/Cairo";

function clockMinute(time: string) {
  const value = String(time ?? "").trim().toUpperCase();
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/);
  if (!match) return 0;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3]) {
    if (hour === 12) hour = 0;
    if (match[3] === "PM") hour += 12;
  }
  return hour * 60 + minute;
}

export function wallClockMinute(date: Date, timeZone = ACADEMY_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const daySerial = Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
  return daySerial * 24 * 60 + value("hour") * 60 + value("minute");
}

export function lessonWallClockMinute(date: string, time: string) {
  const [year, month, day] = String(date ?? "").slice(0, 10).split("-").map(Number);
  const daySerial = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return daySerial * 24 * 60 + clockMinute(time);
}

export function lessonEndWallClockMinute(date: string, start: string, end: string) {
  const startsAt = lessonWallClockMinute(date, start);
  const endsAt = lessonWallClockMinute(date, end);
  return endsAt <= startsAt ? endsAt + 24 * 60 : endsAt;
}

export function isLessonActive(
  lesson: Pick<Lesson, "date" | "start_time" | "end_time">,
  now = new Date(),
) {
  const current = wallClockMinute(now);
  const startsAt = lessonWallClockMinute(lesson.date, lesson.start_time);
  const endsAt = lessonEndWallClockMinute(lesson.date, lesson.start_time, lesson.end_time);
  return startsAt <= current && current <= endsAt;
}
