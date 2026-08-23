"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useClientLang } from "@/lib/i18n-client";

export function ErrorFallback({
  error,
  reset,
  global = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  global?: boolean;
}) {
  const en = useClientLang() === "en";
  React.useEffect(() => {
    console.error("Unhandled application error", { message: error.message, digest: error.digest });
    toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ غير متوقع. حاول مرة أخرى.");
  }, [error, en]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6" dir={en ? "ltr" : "rtl"}>
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <TriangleAlert className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-bold">{en ? "We hit an unexpected problem" : "حدثت مشكلة غير متوقعة"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {en ? "Your data is safe. Reload this section and try again." : "بياناتك محفوظة. أعد تحميل هذا الجزء وحاول مرة أخرى."}
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          {en ? (global ? "Reload app" : "Try again") : (global ? "إعادة تحميل التطبيق" : "حاول مرة أخرى")}
        </Button>
      </section>
    </main>
  );
}
