import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { createPortalSession } from "@/lib/portal-session";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608241330_portal_credentials.sql"), "utf8");
const auth = readFileSync(resolve(process.cwd(), "services/portal-auth.ts"), "utf8");
const session = readFileSync(resolve(process.cwd(), "lib/portal-session.ts"), "utf8");
const studentService = readFileSync(resolve(process.cwd(), "services/students.ts"), "utf8");
const loginPage = readFileSync(resolve(process.cwd(), "components/portal/portal-login-form.tsx"), "utf8");

const previousSecret = process.env.PORTAL_SESSION_SECRET;
process.env.PORTAL_SESSION_SECRET = "portal-test-secret-with-at-least-32-characters";

describe("portal credentials contract", () => {
  it("stores a unique-per-academy email and a password hash column", () => {
    expect(migration).toContain("portal_email text");
    expect(migration).toContain("portal_password text");
    expect(migration).toContain("students_portal_email_academy_unique_idx");
    expect(migration).toContain("lower(portal_email)");
    expect(migration).toContain("bcrypt hash");
  });

  it("uses bcrypt-compatible hashing and never persists plaintext", async () => {
    const password = "Readable2X";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(auth).toContain("bcrypt.hash(password, 12)");
    expect(auth).toContain("portal_password: hash");
    expect(auth).not.toContain("portal_password: password");
  });

  it("creates a signed HttpOnly portal session with the required claims", async () => {
    const raw = await createPortalSession({ student_id: "student-1", academy_id: "academy-1", role: "student", portal_email: "student@example.local" });
    expect(raw.split(".")).toHaveLength(3);
    expect(session).toContain('PORTAL_SESSION_COOKIE = "ma_portal_session"');
    expect(session).toContain("httpOnly: true");
    expect(session).toContain("student_id");
    expect(session).toContain("academy_id");
    expect(session).toContain("role");
    expect(session).toContain('alg: "HS256"');
  });

  it("enforces Admin-only provisioning and tenant-constrained updates", () => {
    expect(auth).toContain('user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"');
    expect(auth).toContain('.eq("academy_id", user.academy_id)');
    expect(auth).toContain('.eq("id", student.id)');
    expect(auth).toContain('.eq("academy_id", student.academy_id)');
    expect(studentService).toContain("portal_password: _portalPassword");
  });

  it("requires role selection and keeps separate destination routes", () => {
    expect(loginPage).toContain('name="role" value="student"');
    expect(loginPage).toContain('name="role" value="parent"');
    expect(loginPage).toContain("required");
    expect(auth).toContain('redirect(role === "parent" ? "/portal/parent" : "/portal/student")');
  });
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.PORTAL_SESSION_SECRET;
  else process.env.PORTAL_SESSION_SECRET = previousSecret;
});
