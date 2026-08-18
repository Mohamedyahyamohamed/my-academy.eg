import type { MetadataRoute } from "next";

const baseUrl = "https://my-academy-eg.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = ["/", "/pricing", "/login", "/signup", "/forgot-password", "/help", "/status", "/privacy", "/terms"];
  return publicPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date("2026-08-18T00:00:00.000Z"),
    changeFrequency: path === "/status" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" || path === "/signup" ? 0.8 : 0.5,
  }));
}
