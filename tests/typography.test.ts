import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("platform typography", () => {
  const layout = read("app/layout.tsx");
  const styles = read("app/globals.css");

  it("bundles the Arabic-friendly Tajawal weights locally", () => {
    expect(layout).toContain('@fontsource/tajawal/400.css');
    expect(layout).toContain('@fontsource/tajawal/500.css');
    expect(layout).toContain('@fontsource/tajawal/700.css');
    expect(layout).toContain('@fontsource/tajawal/800.css');
  });

  it("uses Tajawal as the global sans font with a readable base rhythm", () => {
    expect(styles).toContain('--font-sans: "Tajawal", "Geist"');
    expect(styles).toContain('font-family: var(--font-sans);');
    expect(styles).toContain('line-height: 1.6;');
  });
});
