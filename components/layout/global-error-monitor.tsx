"use client";

import * as React from "react";
import { toast } from "sonner";
import { useClientLang } from "@/lib/i18n-client";

export function GlobalErrorMonitor() {
  const en = useClientLang() === "en";

  React.useEffect(() => {
    const notify = () => {
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ غير متوقع. حاول مرة أخرى.");
    };
    const onError = (event: ErrorEvent) => {
      console.error("Unhandled browser error", event.error);
      notify();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled server action or promise rejection", event.reason);
      event.preventDefault();
      notify();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [en]);

  return null;
}
