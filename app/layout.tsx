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
  return {
    title: {
      default: `${APP_CONFIG.name} — ${en ? "Run your academy with clarity and ease" : APP_CONFIG.tagline}`,
      template: `%s · ${APP_CONFIG.name}`,
    },
    description: en
      ? "A complete platform for managing students, groups, attendance, payments, grades, and role-based academy portals."
      : APP_CONFIG.description,
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
