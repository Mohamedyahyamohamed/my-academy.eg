const DEFAULT_APP_ORIGIN = "https://my-academy-eg.vercel.app";

/**
 * The personal student QR is a URL so phone cameras recognize it as usable data.
 * The teacher scanner also accepts this URL and extracts the student id locally.
 */
export function studentQrValue(studentId: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_ORIGIN).replace(/\/$/, "");
  return `${base}/checkin?studentId=${encodeURIComponent(studentId)}`;
}

export function studentIdFromQrValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("MA:")) return trimmed.slice(3);

  try {
    const url = new URL(trimmed);
    const studentId = url.searchParams.get("studentId") || url.searchParams.get("student");
    if (studentId) return studentId;
  } catch {
    // The scanner may receive a plain student id from older cards.
  }

  return trimmed;
}
