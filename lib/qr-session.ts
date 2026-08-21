/**
 * Secure QR session tokens — short-lived and scoped to one academy/lesson.
 * The signing secret is deliberately independent from Supabase service-role
 * credentials and must be configured explicitly in every environment.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SESSION_TTL_MS = 5 * 60 * 1000;

type QrPayload = {
  academyId: string;
  lessonId: string;
  nonce: string;
  exp: number;
};

function qrSessionSecret(): string {
  const secret = process.env.QR_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("QR_SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", qrSessionSecret()).update(data).digest("hex");
}

/** Create a signed, short-lived QR session token for a lesson. */
export function createQrSession(
  academyId: string,
  lessonId: string,
): { token: string; expiresAt: number } {
  const payload: QrPayload = {
    academyId,
    lessonId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${data}.${sign(data)}`, expiresAt: payload.exp };
}

/** Return true only when a verified token is for the authenticated tenant and requested lesson. */
export function qrSessionMatchesRequest(
  session: { academyId: string; lessonId: string } | null,
  academyId: string,
  requestedLessonId?: string,
): boolean {
  return Boolean(
    session &&
    session.academyId === academyId &&
    (!requestedLessonId || session.lessonId === requestedLessonId),
  );
}

/** Verify a QR session token and return its tenant-scoped claims. */
export function verifyQrSession(
  token: string,
): { academyId: string; lessonId: string; exp: number; nonce: string } | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return null;
    const expected = Buffer.from(sign(data), "hex");
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as Partial<QrPayload>;
    if (
      typeof payload.academyId !== "string" ||
      typeof payload.lessonId !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() > payload.exp
    ) return null;
    return {
      academyId: payload.academyId,
      lessonId: payload.lessonId,
      nonce: payload.nonce,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
