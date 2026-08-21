import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attendanceErrorCode, isDuplicateAttendanceError } from "@/lib/attendance-errors";
import { createQrSession, qrSessionMatchesRequest, verifyQrSession } from "@/lib/qr-session";

beforeEach(() => {
  process.env.QR_SESSION_SECRET = "test-qr-session-secret-with-at-least-32-bytes";
  vi.useRealTimers();
});

describe("QR negative and recovery regression coverage", () => {
  it("accepts a valid token and binds it to the requested academy and lesson", () => {
    const created = createQrSession("academy-a", "lesson-a");
    const verified = verifyQrSession(created.token);
    expect(qrSessionMatchesRequest(verified, "academy-a", "lesson-a")).toBe(true);
    expect(qrSessionMatchesRequest(verified, "academy-b", "lesson-a")).toBe(false);
    expect(qrSessionMatchesRequest(verified, "academy-a", "lesson-b")).toBe(false);
  });

  it.each([
    ["random QR", "random-value"],
    ["missing signature", "eyJub3QiOiJ2YWxpZCJ9"],
  ])("denies %s without throwing", (_label, token) => {
    expect(() => verifyQrSession(token)).not.toThrow();
    expect(verifyQrSession(token)).toBeNull();
  });

  it("denies a token when its payload or signature is tampered", () => {
    const created = createQrSession("academy-a", "lesson-a");
    const [payload, signature] = created.token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ academyId: "academy-b", lessonId: "lesson-a", nonce: "x", exp: created.expiresAt }), "utf8").toString("base64url");
    expect(verifyQrSession(`${tamperedPayload}.${signature}`)).toBeNull();
    expect(verifyQrSession(`${payload}.${"0".repeat(64)}`)).toBeNull();
  });

  it("denies expired QR sessions", () => {
    const created = createQrSession("academy-a", "lesson-a");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(created.expiresAt + 1));
    expect(verifyQrSession(created.token)).toBeNull();
  });

  it("maps duplicate and database race errors to the same stable denial", () => {
    for (const message of ["duplicate key value violates unique constraint", "23505", "attendance already exists"]) {
      expect(isDuplicateAttendanceError(message)).toBe(true);
      expect(attendanceErrorCode(message)).toBe("ATTENDANCE_ALREADY_RECORDED");
    }
  });

  it("has an atomic database uniqueness guard for concurrent check-ins", () => {
    const schema = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
    const route = readFileSync(resolve(process.cwd(), "app/api/checkin/route.ts"), "utf8");
    expect(schema).toMatch(/unique\s*\(\s*lesson_id\s*,\s*student_id\s*\)/i);
    expect(route).toMatch(/duplicate|already exists|unique|23505/i);
    expect(route).toContain("ATTENDANCE_ALREADY_RECORDED");
  });

  it("keeps offline camera behavior explicit and recoverable", () => {
    const scanner = readFileSync(resolve(process.cwd(), "components/attendance/scan-workshop.tsx"), "utf8");
    expect(scanner).toContain("navigator.onLine");
    expect(scanner).toContain("Scanning is unavailable offline");
    expect(scanner).toContain("تعذّر تشغيل الكاميرا");
    expect(scanner).toContain("try again");
  });
});
