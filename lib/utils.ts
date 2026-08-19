import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely (handles conflicts + conditional classes).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as currency (defaults to EGP for the academy's locale). */
export function formatCurrency(
  amount: number,
  currency: string = "EGP",
  locale: string = "ar-EG",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/** Format a number compactly (e.g. 1.2k). */
export function formatCompact(value: number, locale: string = "en-US") {
  return new Intl.NumberFormat(locale, { notation: "compact" }).format(
    value || 0,
  );
}

/** Format an ISO date string into a readable date. */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
  locale: string = "ar-EG",
) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

/** Format an ISO date string to time only using a 12-hour clock. */
export function formatTime(date: string | Date | null | undefined, locale: string = "ar-EG") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Format a database wall-clock value such as "16:00" without applying a timezone. */
export function formatClockTime(value: string | null | undefined, locale: string = "ar-EG") {
  if (!value) return "—";
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(AM|PM)?$/i);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[4]?.toUpperCase();
  if (meridiem) hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  if (hour > 23 || minute > 59) return value;
  const d = new Date(2000, 0, 1, hour, minute, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

/** Format a start/end wall-clock range in the user's locale. */
export function formatTimeRange(start: string | null | undefined, end: string | null | undefined, locale: string = "ar-EG") {
  return `${formatClockTime(start, locale)} – ${formatClockTime(end, locale)}`;
}

/** Standard schedule payload saved by the group form. */
export type StructuredSchedule = { days: string[]; start: string; end: string };

export function buildSchedule(days: string[], start: string, end: string) {
  return `SCHEDULE_V1|days=${days.join(",")}\u007cstart=${start}\u007cend=${end}`;
}

export function parseSchedule(schedule: string | null | undefined): StructuredSchedule | null {
  if (!schedule) return null;
  const match = schedule.match(/^SCHEDULE_V1\|days=([^|]*)\|start=([^|]+)\|end=([^|]+)$/);
  if (!match) return null;
  return { days: match[1] ? match[1].split(",").filter(Boolean) : [], start: match[2], end: match[3] };
}

const DAY_LABELS: Record<string, { ar: string; en: string }> = {
  sat: { ar: "السبت", en: "Saturday" }, sun: { ar: "الأحد", en: "Sunday" }, mon: { ar: "الإثنين", en: "Monday" },
  tue: { ar: "الثلاثاء", en: "Tuesday" }, wed: { ar: "الأربعاء", en: "Wednesday" }, thu: { ar: "الخميس", en: "Thursday" }, fri: { ar: "الجمعة", en: "Friday" },
};

/** Format both new structured schedules and legacy free-text schedules. */
export function formatSchedule(schedule: string | null | undefined, locale: string = "ar-EG") {
  if (!schedule) return "—";
  const structured = parseSchedule(schedule);
  if (structured) {
    const language = locale.toLowerCase().startsWith("en") ? "en" : "ar";
    const days = structured.days.map((day) => DAY_LABELS[day]?.[language] ?? day).join(language === "en" ? ", " : "، ");
    return `${days || "—"} · ${formatTimeRange(structured.start, structured.end, locale)}`;
  }
  return schedule.replace(/\b(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?!\s*(?:AM|PM|ص|م)\b)/gi, (token) => formatClockTime(token, locale));
}

/** Relative time, e.g. "2 days ago". */
export function formatRelative(date: string | Date | null | undefined, locale: string = "ar-EG") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const min = 60_000,
    hr = 3_600_000,
    day = 86_400_000;
  if (abs < hr) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hr), "hour");
  if (abs < day * 30) return rtf.format(Math.round(diff / day), "day");
  return formatDate(d, undefined, locale);
}

/** Build initials from a name. */
export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Combine first/last into a full name. */
export function fullName(p: { first_name: string; last_name: string }) {
  return `${p.first_name} ${p.last_name}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Round to n decimals. */
export function round(value: number, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Safe percentage helper. */
export function percentage(part: number, whole: number, decimals = 0) {
  if (!whole) return 0;
  return round((part / whole) * 100, decimals);
}

/** Deterministic pastel-ish color from a string (for avatars/charts). */
export function colorFromString(str: string) {
  const palette = [
    "bg-violet-500",
    "bg-indigo-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-fuchsia-500",
    "bg-teal-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** Simple delay helper for simulating latency in the demo store. */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Paginate an array in-memory (used by demo data layer). */
export function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Pluralize a word based on count. */
export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
