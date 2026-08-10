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
  locale: string = "en-US",
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
) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

/** Format an ISO date string to time only. */
export function formatTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Relative time, e.g. "2 days ago". */
export function formatRelative(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const min = 60_000,
    hr = 3_600_000,
    day = 86_400_000;
  if (abs < hr) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hr), "hour");
  if (abs < day * 30) return rtf.format(Math.round(diff / day), "day");
  return formatDate(d);
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
