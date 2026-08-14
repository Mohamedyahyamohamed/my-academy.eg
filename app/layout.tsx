import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/constants";
import { getLangFromCookie, isRTL } from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeNotifications } from "@/components/layout/realtime-notifications";
import "./globals.css";

// خط النظام بدل next/font/google — عشان يشتغل أوفلاين ومن غير إنترنت لـ Google.

export const metadata: Metadata = {
  title: {
    default: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`,
    template: `%s · ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
};

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
        <TooltipProvider delayDuration={200}>
          <RealtimeNotifications />
          {children}
        </TooltipProvider>
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
