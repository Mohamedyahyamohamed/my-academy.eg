"use client";

import "./globals.css";
import { ErrorFallback } from "@/components/errors/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans">
        <ErrorFallback error={error} reset={reset} global />
      </body>
    </html>
  );
}
