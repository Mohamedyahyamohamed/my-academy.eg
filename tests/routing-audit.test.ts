import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function walk(dir: string, predicate: (file: string) => boolean, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function routeFromFile(file: string) {
  let route = path.relative(path.join(root, "app"), path.dirname(file)).split(path.sep).join("/");
  route = route.split("/").filter((part) => !/^\([^/]+\)$/.test(part)).join("/");
  route = route === "." ? "" : route;
  return `/${route}`
    .replace(/\[\.\.\.([^\]]+)\]/g, ":$1*")
    .replace(/\[\[\.\.\.([^\]]+)\]\]/g, ":$1*")
    .replace(/\[([^\]]+)\]/g, ":$1")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "") || "/";
}

function routeMatches(reference: string, route: string) {
  const pattern = route
    .split("/")
    .map((part) => part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
    .join("\\/");
  return new RegExp(`^${pattern}$`).test(reference);
}

describe("routing contracts", () => {
  const routeFiles = walk(path.join(root, "app"), (file) => /^(page|route|not-found)\.(tsx|ts)$/.test(path.basename(file)));
  const routes = new Set(routeFiles.map(routeFromFile));
  const sourceFiles = ["app", "components", "services", "lib"]
    .map((dir) => path.join(root, dir))
    .filter(fs.existsSync)
    .flatMap((dir) => walk(dir, (file) => /\.(tsx|ts)$/.test(file)));

  it("contains every public and internal route used by the app", () => {
    const references: Array<{ file: string; raw: string }> = [];
    const patterns = [
      /(?:href|to)\s*=\s*["'`]([^"'`]+)["'`]/g,
      /(?:router\.(?:push|replace)|redirect)\(\s*["'`]([^"'`]+)["'`]/g,
      /Link\s+href=\{["'`]([^"'`]+)["'`]\}/g,
    ];
    for (const file of sourceFiles) {
      const text = fs.readFileSync(file, "utf8");
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
          const raw = match[1];
          if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/api/")) continue;
          references.push({ file: path.relative(root, file), raw });
        }
      }
    }

    const unknown = references.filter(({ raw }) => {
      const reference = raw
        .split(/[?#]/)[0]
        .replace(/\$\{[^}]+\}/g, ":param")
        .replace(/\/+/g, "/")
        .replace(/\/$/, "") || "/";
      return ![...routes].some((route) => route === reference || routeMatches(reference, route));
    });

    expect(unknown, unknown.map((item) => `${item.file}: ${item.raw}`).join("\n")).toEqual([]);
  });

  it("has the branded Arabic root fallback", () => {
    const notFound = fs.readFileSync(path.join(root, "app/not-found.tsx"), "utf8");
    expect(notFound).toContain("الصفحة غير موجودة");
    expect(notFound).toContain('href="/"');
  });

  it("keeps the key public entry points present", () => {
    for (const route of ["/", "/login", "/signup", "/pricing", "/support", "/terms", "/privacy", "/status", "/portal/:token"]) {
      expect(routes.has(route)).toBe(true);
    }
  });
});
