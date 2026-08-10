/**
 * Secure QR session tokens — short-lived, signed, single-use per student.
 * Prevents replay and remote check-in abuse.
 */
import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret-change-me";
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Create a signed, short-lived QR session token for a lesson. */
export function createQrSession(lessonId: string): { token: string; expiresAt: number } {
  const payload = {
    lessonId,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("hex");
  return { token: `${data}.${sig}`, expiresAt: payload.exp };
}

/** Verify a QR session token. Returns lessonId if valid, null otherwise. */
export function verifyQrSession(token: string): { lessonId: string; exp: number } | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = createHmac("sha256", SECRET).update(data).digest("hex");
    if (sig !== expectedSig) return null; // signature mismatch
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (Date.now() > payload.exp) return null; // expired
    return { lessonId: payload.lessonId, exp: payload.exp };
  } catch {
    return null;
  }
}
