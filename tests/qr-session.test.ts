import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQrSession, verifyQrSession } from "@/lib/qr-session";

beforeEach(() => {
  process.env.QR_SESSION_SECRET = "test-qr-session-secret-with-at-least-32-bytes";
  vi.useRealTimers();
});

describe("QR session security", () => {
  it("accepts a signed token and preserves its tenant and lesson claims", () => {
    const created = createQrSession("academy-a", "lesson-a");
    expect(verifyQrSession(created.token)).toMatchObject({ academyId: "academy-a", lessonId: "lesson-a" });
    expect(created.expiresAt).toBeGreaterThan(Date.now());
  });

  it("denies a malformed or tampered token", () => {
    const created = createQrSession("academy-a", "lesson-a");
    expect(verifyQrSession("not-a-qr-token")).toBeNull();
    expect(verifyQrSession(`${created.token}tampered`)).toBeNull();
  });

  it("denies an expired token", () => {
    const created = createQrSession("academy-a", "lesson-a");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(created.expiresAt + 1));
    expect(verifyQrSession(created.token)).toBeNull();
  });

  it("keeps Academy A and Academy B claims distinct for server-side route checks", () => {
    const academyAToken = createQrSession("academy-a", "lesson-a").token;
    const academyBToken = createQrSession("academy-b", "lesson-b").token;
    expect(verifyQrSession(academyAToken)?.academyId).toBe("academy-a");
    expect(verifyQrSession(academyAToken)?.academyId).not.toBe("academy-b");
    expect(verifyQrSession(academyBToken)?.academyId).toBe("academy-b");
    expect(verifyQrSession(academyBToken)?.academyId).not.toBe("academy-a");
  });
});
