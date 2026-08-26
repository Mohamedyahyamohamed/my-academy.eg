import { NextRequest, NextResponse } from "next/server";

/**
 * Platform-owner containment at the edge.
 *
 * The signed application session cookie (ma_session) carries the user's role.
 * Its signature is verified server-side on every page (requireScopedRole), so
 * the middleware here only performs a cheap, fail-open routing decision:
 * a platform owner browsing academy-operations pages is redirected to
 * /platform, and everyone else passes through to the page-level guards.
 *
 * This replaces the dead x-invoke-path/x-matched-path header check that lived
 * in app/(app)/layout.tsx (those headers were removed from modern Next.js).
 */
const PLATFORM_ALLOWED = [
  "/platform",
  "/audit",
  "/settings",
  "/support",
  "/privacy",
  "/terms",
  "/help",
  "/notifications",
  "/messages",
];

// Public surfaces never need a session — let them through untouched.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/consent",
  "/checkin",
  "/portal",
  "/pricing",
  "/privacy",
  "/terms",
  "/status",
  "/support",
  "/suspended",
];

function b64urlDecodeToString(value: string): string | null {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Read the role claim from the signed session cookie WITHOUT verifying it. */
function readRoleClaim(rawCookie?: string): string | null {
  if (!rawCookie?.startsWith("v1.")) return null;
  const parts = rawCookie.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  const json = b64urlDecodeToString(parts[1]);
  if (!json) return null;
  try {
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isAllowedForPlatformOwner(pathname: string): boolean {
  return PLATFORM_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const role = readRoleClaim(request.cookies.get("ma_session")?.value);
  if (
    role === "SUPER_ADMIN" &&
    pathname !== "/" &&
    !PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    !isAllowedForPlatformOwner(pathname)
  ) {
    return NextResponse.redirect(new URL("/platform", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on page navigations only — skip APIs, static assets and PWA files.
    "/((?!api|_next/static|_next/image|icons|sounds|manifest.webmanifest|sw.js|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
