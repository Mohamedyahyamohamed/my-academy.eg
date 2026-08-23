import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Next.js redirect handling", () => {
  it("rethrows redirect errors from server action wrappers", () => {
    const source = read("lib/server-action-result.ts");
    expect(source).toContain("isRedirectError(error)");
    expect(source).toContain("if (isRedirectError(error)) throw error;");
    expect(read("app/actions/groups.ts")).toContain("@/lib/server-action-result");
  });

  it("does not turn a navigation redirect into a group-save toast", () => {
    const source = read("components/groups/group-form.tsx");
    expect(source).toContain("if (isRedirectError(err)) throw err;");
    expect(source.indexOf("if (isRedirectError(err)) throw err;"))
      .toBeLessThan(source.indexOf("toast.error(detailed)"));
  });
});
