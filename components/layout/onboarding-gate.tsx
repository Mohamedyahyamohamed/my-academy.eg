"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useClientLang } from "@/lib/i18n-client";

export function OnboardingGate({
  required,
  children,
}: {
  required: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const en = useClientLang() === "en";
  const router = useRouter();
  const isOnboarding = pathname === "/onboarding";

  React.useEffect(() => {
    if (required && !isOnboarding) {
      router.replace("/onboarding");
    }
  }, [isOnboarding, required, router]);

  if (required && !isOnboarding) {
    return (
      <div dir={en ? "ltr" : "rtl"} className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {en ? "Opening setup steps…" : "جارٍ فتح خطوات البداية…"}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
