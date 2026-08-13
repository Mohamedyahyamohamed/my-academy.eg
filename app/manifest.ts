import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MY Academy",
    short_name: "MY Academy",
    description: "منصة إدارة الأكاديميات والطلاب وأولياء الأمور في مكان واحد.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c5cfc",
    dir: "rtl",
    lang: "ar",
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
