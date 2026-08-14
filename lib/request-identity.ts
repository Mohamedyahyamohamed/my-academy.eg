import { createHash } from "crypto";

/**
 * Return a short, non-reversible request fingerprint for abuse controls.
 * Raw IP and User-Agent values are never persisted by this helper.
 */
export function requestFingerprint(request: Request, scope: string, subject?: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown-ip";
  const userAgent = request.headers.get("user-agent")?.slice(0, 160) || "unknown-agent";
  const value = `${scope}|${subject || "anonymous"}|${ip}|${userAgent}`;
  return `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

export function requestIpKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown-ip";
  return `${scope}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}
