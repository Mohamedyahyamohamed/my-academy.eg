"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";

const FALLBACK_PATH = "/dashboard";

export function BackButton({ fallback = FALLBACK_PATH }: { fallback?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const en = useClientLang() === "en";
  const [canGoBack, setCanGoBack] = React.useState(false);

  React.useEffect(() => {
    // A client-side navigation keeps the original document.referrer, so use a
    // session marker as well. This preserves list filters when opening details,
    // while a first-time direct visit still falls back safely.
    const marker = "myacademy_internal_navigation";
    const hadInternalVisit = window.sessionStorage.getItem(marker) === "1";
    const sameOriginReferrer = document.referrer.startsWith(window.location.origin);
    setCanGoBack(window.history.length > 1 && (sameOriginReferrer || hadInternalVisit));
    window.sessionStorage.setItem(marker, "1");
  }, [pathname]);

  const goBack = () => {
    if (canGoBack) router.back();
    else router.push(fallback);
  };

  const Icon = en ? ArrowLeft : ArrowRight;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={goBack}
      aria-label={en ? "Go back" : "الرجوع للصفحة السابقة"}
      className="gap-2"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {en ? "Back" : "رجوع"}
    </Button>
  );
}
