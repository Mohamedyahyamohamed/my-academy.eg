import type { MetadataRoute } from "next";

const baseUrl = "https://my-academy-eg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/platform", "/teacher", "/parent", "/student", "/api/", "/_next/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
