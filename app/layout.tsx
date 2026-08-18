import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/constants";
import { getLangFromCookie, isRTL } from "@/lib/i18n";
import "./globals.css";

// خط النظام بدل next/font/google — عشان يشتغل أوفلاين ومن غير إنترنت لـ Google.

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
        {children}
        <Toaster
          position={dir === "rtl" ? "top-left" : "top-right"}
          richColors
          closeButton
          toastOptions={{ style: { borderRadius: "0.65rem" } }}
        />
      </body>
    </html>
  );
}
