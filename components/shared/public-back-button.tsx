"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "./back-button";

const APP_ROUTES = [
  "/dashboard", "/students", "/groups", "/lessons", "/attendance", "/payments", "/grades",
  "/homework", "/analytics", "/reports", "/settings", "/audit", "/billing", "/calendar",
  "/messages", "/notifications", "/parent", "/student", "/teacher", "/platform", "/support",
  "/onboarding", "/suspended", "/export", "/super-admin", "/parents", "/help",
];

export function PublicBackButton() {
  const pathname = usePathname();
  const isAppRoute = APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (pathname === "/" || isAppRoute) return null;

  return (
    <div className="fixed start-4 top-4 z-[70] print:hidden">
      <BackButton fallback="/" />
    </div>
  );
}
