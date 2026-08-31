import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/constants";
import { getLangFromCookie, isRTL } from "@/lib/i18n";
import { PwaRegister } from "@/components/layout/pwa-register";
import { GlobalErrorMonitor } from "@/components/layout/global-error-monitor";
import { PublicBackButton } from "@/components/shared/public-back-button";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "./globals.css";

// خط Cairo العربي+اللاتيني (أوفلاين) — مناسب لمنصة تعليمية مصرية.

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c5cfc",
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const title = `${APP_CONFIG.name} — ${en ? "Run your academy with clarity and ease" : APP_CONFIG.tagline}`;
  const description = en
    ? "A complete platform for managing students, groups, attendance, payments, grades, and role-based academy portals."
    : APP_CONFIG.description;

  return {
    metadataBase: new URL("https://my-academy-eg.vercel.app"),
    title: {
      default: title,
      template: `%s · ${APP_CONFIG.name}`,
    },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: APP_CONFIG.name,
      title,
      description,
      url: "/",
      locale: en ? "en_US" : "ar_EG",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: true, follow: true },
    appleWebApp: {
      capable: true,
      title: APP_CONFIG.name,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icons/icon-192.png",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = getLangFromCookie(cookieStore.get("ma_lang")?.value);
  const dir = isRTL(lang) ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className="font-sans">
        <PwaRegister />
        <GlobalErrorMonitor />
        <PublicBackButton />
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            className: "rounded-xl px-4 py-3 text-sm shadow-lg",
            style: { borderRadius: "0.75rem" },
          }}
        />
      </body>
    </html>
  );
}
