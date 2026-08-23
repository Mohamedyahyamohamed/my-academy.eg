import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { actionFailure, isActionFailure } from "@/lib/action-result";

describe("core stability and QR print contracts", () => {
  it("normalizes internal action failures to a safe user-facing response", () => {
    const result = actionFailure(new Error("PostgREST relation violation at db.ts:1"), "تعذر تنفيذ العملية.", "ACTION_FAILED");
    expect(isActionFailure(result)).toBe(true);
    expect(result).toEqual({ ok: false, error: "تعذر تنفيذ العملية.", code: "ACTION_FAILED" });
  });

  it("has route-level and global error fallbacks", () => {
    const routeError = readFileSync(resolve(process.cwd(), "app/error.tsx"), "utf8");
    const globalError = readFileSync(resolve(process.cwd(), "app/global-error.tsx"), "utf8");
    const fallback = readFileSync(resolve(process.cwd(), "components/errors/error-fallback.tsx"), "utf8");
    expect(routeError).toContain("ErrorFallback");
    expect(globalError).toContain("<html lang=\"ar\" dir=\"rtl\">");
    expect(fallback).toContain("toast.error");
    expect(fallback).toContain("حدث خطأ غير متوقع");
    expect(fallback).toContain("reset");
  });

  it("keeps group deletion standardized and exposes the requested QR print alias", () => {
    const action = readFileSync(resolve(process.cwd(), "app/actions/groups.ts"), "utf8");
    const alias = readFileSync(resolve(process.cwd(), "app/(app)/groups/[id]/print-qr/page.tsx"), "utf8");
    const groupPage = readFileSync(resolve(process.cwd(), "app/(app)/groups/[id]/page.tsx"), "utf8");
    expect(action).toContain("safeAction");
    expect(action).toContain("GROUP_DELETE_FAILED");
    expect(alias).toContain('"../qr-print/page"');
    expect(groupPage).toContain("طباعة بطاقات QR");
  });
});
