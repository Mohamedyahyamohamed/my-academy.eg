import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @ts-expect-error server-only is provided by Next.js at build time and mocked only in Vitest.
vi.mock("server-only", () => ({}), { virtual: true });

import { updateStudentAction } from "@/app/actions/students";
import { isActionFailure } from "@/lib/action-result";

describe("updateStudentAction validation feedback", () => {
  it("rebinds academy context before syncing student groups", () => {
    const action = readFileSync(resolve(process.cwd(), "app/actions/students.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "services/students.ts"), "utf8");
    expect(action).toContain('import { setRequestContext } from "@/services/request-context";');
    expect(action).toContain("setRequestContext(user);");
    expect(service).toContain('import { setRequestContext } from "./request-context";');
    expect(service).toContain("if (authenticatedUser) setRequestContext(authenticatedUser);");
  });
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
