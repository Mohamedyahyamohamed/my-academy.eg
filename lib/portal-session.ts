import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export const PORTAL_SESSION_COOKIE = "ma_portal_session";
const PORTAL_SESSION_MAX_AGE = 60 * 60 * 8;

export type PortalRole = "student" | "parent";

export interface PortalSession {
  student_id: string;
  academy_id: string;
  role: PortalRole;
  portal_email: string;
}

function secretKey() {
  const raw = process.env.PORTAL_SESSION_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error("PORTAL_SESSION_SECRET or SESSION_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(raw);
}

export async function createPortalSession(session: PortalSession) {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function readPortalSession(): Promise<PortalSession | null> {
  const raw = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.student_id !== "string" ||
      typeof payload.academy_id !== "string" ||
      typeof payload.portal_email !== "string" ||
      (payload.role !== "student" && payload.role !== "parent")
    ) return null;
    return {
      student_id: payload.student_id,
      academy_id: payload.academy_id,
      portal_email: payload.portal_email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function setPortalSessionCookie(session: PortalSession) {
  const token = await createPortalSession(session);
  (await cookies()).set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: PORTAL_SESSION_MAX_AGE,
  });
}

export async function clearPortalSessionCookie() {
  (await cookies()).set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: 0,
  });
}
