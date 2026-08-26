import { describe, expect, it } from "vitest";
import { generatedParentEmail } from "@/services/misc";

describe("parent creation identity", () => {
  it("generates a stable readable local email from the parent name and nonce", () => {
    expect(generatedParentEmail("Ibrahim", "Atta", "ABC123")).toBe("ibrahim.atta.abc123@parent.local");
  });

  it("keeps same-name parents unique inside the academy", () => {
    const first = generatedParentEmail("Ibrahim", "Atta", "first-parent-id");
    const second = generatedParentEmail("Ibrahim", "Atta", "second-parent-id");
    expect(first).not.toBe(second);
    expect(first).toMatch(/@parent\.local$/);
    expect(second).toMatch(/@parent\.local$/);
  });

  it("falls back safely for names without latin characters", () => {
    expect(generatedParentEmail("ولي", "الأمر", "arabic-parent")).toBe("parent.arabicpare@parent.local");
  });
});
