export const GLOBAL_GRADE_OPTIONS = [
  "الصف الأول الابتدائي",
  "الصف الثاني الابتدائي",
  "الصف الثالث الابتدائي",
  "الصف الرابع الابتدائي",
  "الصف الخامس الابتدائي",
  "الصف السادس الابتدائي",
  "الصف الأول الإعدادي",
  "الصف الثاني الإعدادي",
  "الصف الثالث الإعدادي",
  "الصف الأول الثانوي",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
  "مرحلة جامعية",
  "خريج",
] as const;

export type GlobalGrade = (typeof GLOBAL_GRADE_OPTIONS)[number];

/**
 * Normalizes known historical CSV spellings to the single UI vocabulary.
 * Unknown values are preserved rather than guessed, so no student data is lost.
 */
export function normalizeGrade(value: string | null | undefined): string | null {
  const raw = (value ?? "").replace(/\u200f|\u200e/g, "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const compact = raw
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");

  const direct: Record<string, GlobalGrade> = {
    "الصف الاول الابتدائي": "الصف الأول الابتدائي",
    "الصف الثاني الابتدائي": "الصف الثاني الابتدائي",
    "الصف الثالث الابتدائي": "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي": "الصف الرابع الابتدائي",
    "الصف الخامس الابتدائي": "الصف الخامس الابتدائي",
    "الصف السادس الابتدائي": "الصف السادس الابتدائي",
    "الصف الاول الاعدادي": "الصف الأول الإعدادي",
    "الصف الثاني الاعدادي": "الصف الثاني الإعدادي",
    "الصف الثالث الاعدادي": "الصف الثالث الإعدادي",
    "تالته اعدادي": "الصف الثالث الإعدادي",
    "الصف الاول الثانوي": "الصف الأول الثانوي",
    "اولي ثانوي": "الصف الأول الثانوي",
    "ثانوي": "الصف الأول الثانوي",
    "الصف الثاني الثانوي": "الصف الثاني الثانوي",
    "الصف الثالث الثانوي": "الصف الثالث الثانوي",
    "مرحله جامعيه": "مرحلة جامعية",
    "جامعي": "مرحلة جامعية",
    "خريج": "خريج",
  };
  if (direct[compact]) return direct[compact];

  // Handle the known descriptive suffix in imported Azhar entries.
  if (/الصف الاول الثانوي/.test(compact)) return "الصف الأول الثانوي";
  if (/الصف الثاني الثانوي/.test(compact)) return "الصف الثاني الثانوي";
  if (/الصف الثالث الثانوي/.test(compact)) return "الصف الثالث الثانوي";
  if (/الصف الاول الاعدادي/.test(compact)) return "الصف الأول الإعدادي";
  if (/الصف الثاني الاعدادي/.test(compact)) return "الصف الثاني الإعدادي";
  if (/الصف الثالث الاعدادي/.test(compact)) return "الصف الثالث الإعدادي";
  if (/الصف (الاول|الأول) الابتدائي/.test(compact)) return "الصف الأول الابتدائي";
  if (/الصف الثاني الابتدائي/.test(compact)) return "الصف الثاني الابتدائي";
  if (/الصف الثالث الابتدائي/.test(compact)) return "الصف الثالث الابتدائي";
  if (/الصف الرابع الابتدائي/.test(compact)) return "الصف الرابع الابتدائي";
  if (/الصف الخامس الابتدائي/.test(compact)) return "الصف الخامس الابتدائي";
  if (/الصف السادس الابتدائي/.test(compact)) return "الصف السادس الابتدائي";

  return raw;
}

export function gradeMatches(studentGrade: string | null | undefined, selectedGrade: string): boolean {
  if (!selectedGrade || selectedGrade === "ALL") return true;
  return normalizeGrade(studentGrade) === selectedGrade;
}
