import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("educational content action tenant context", () => {
  const action = read("app/actions/content.ts");

  it("rebounds the authenticated academy before content writes and uploads", () => {
    expect(action).toContain('import { setRequestContext } from "@/services/request-context";');
    expect(action.match(/setRequestContext\(user\);/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps content actions as server actions", () => {
    expect(action.startsWith('"use server";')).toBe(true);
  });
});
