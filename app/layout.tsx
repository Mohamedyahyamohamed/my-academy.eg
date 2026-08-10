import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/constants";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeNotifications } from "@/components/layout/realtime-notifications";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`,
    template: `%s · ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <TooltipProvider delayDuration={200}>
          <RealtimeNotifications />
          {children}
        </TooltipProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { borderRadius: "0.65rem" } }}
        />
      </body>
    </html>
  );
}
