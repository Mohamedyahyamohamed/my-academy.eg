import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  return {
    name: "MY Academy",
    short_name: "MY Academy",
    description: en
      ? "Manage academies, students, parents, attendance, grades, and payments in one place."
      : "منصة إدارة الأكاديميات والطلاب وأولياء الأمور في مكان واحد.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c5cfc",
    dir: en ? "ltr" : "rtl",
    lang: en ? "en" : "ar",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
