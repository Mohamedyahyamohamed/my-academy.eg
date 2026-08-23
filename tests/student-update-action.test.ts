import { describe, expect, it, vi } from "vitest";

// @ts-expect-error server-only is provided by Next.js at build time and mocked only in Vitest.
vi.mock("server-only", () => ({}), { virtual: true });

import { updateStudentAction } from "@/app/actions/students";
import { isActionFailure } from "@/lib/action-result";

describe("updateStudentAction validation feedback", () => {
  it("returns a field error for an invalid phone number without touching the database", async () => {
    const result = await updateStudentAction("student-1", { phone: "not-a-phone" });
    expect(isActionFailure(result)).toBe(true);
    if (!isActionFailure(result)) throw new Error("Expected validation failure");
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.fieldErrors?.phone).toBe("رقم الهاتف غير صحيح.");
  });

  it("returns a field error for an invalid email", async () => {
    const result = await updateStudentAction("student-1", { email: "invalid-email" });
    expect(isActionFailure(result)).toBe(true);
    if (!isActionFailure(result)) throw new Error("Expected validation failure");
    expect(result.fieldErrors?.email).toBe("البريد الإلكتروني غير صحيح.");
  });
});
