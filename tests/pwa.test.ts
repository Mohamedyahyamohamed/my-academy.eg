import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("PWA configuration", () => {
  it("ships the installable manifest and standard icons", () => {
    expect(existsSync(resolve(root, "app/manifest.ts"))).toBe(true);
    expect(existsSync(resolve(root, "public/icons/icon-192.png"))).toBe(true);
    expect(existsSync(resolve(root, "public/icons/icon-512.png"))).toBe(true);

    const manifest = readProjectFile("app/manifest.ts");
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain('scope: "/"');
    expect(manifest).toContain("/icons/icon-192.png");
    expect(manifest).toContain("/icons/icon-512.png");
  });

  it("registers the service worker from the root layout", () => {
    const registration = readProjectFile("components/layout/pwa-register.tsx");
    const layout = readProjectFile("app/layout.tsx");
    expect(registration).toContain('navigator.serviceWorker.register("/sw.js"');
    expect(layout).toContain("<PwaRegister />");
  });

  it("does not cache API responses or authenticated pages", () => {
    const serviceWorker = readProjectFile("public/sw.js");
    expect(serviceWorker).toContain('if (event.request.method !== "GET") return;');
    expect(serviceWorker).toContain('url.pathname.startsWith("/_next/static/")');
    expect(serviceWorker).not.toMatch(/pathname\.startsWith\("\/api/);
    expect(serviceWorker).not.toContain('STATIC_ASSETS = ["/"]');
  });
});
