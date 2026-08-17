/**
 * E2E Route-Level Cross-Tenant Isolation Tests — CORRECT VERSION.
 *
 * Uses deterministic IDs from the local Academy B test fixture.
 * Academy A admin tries to access them → MUST get 404.
 * Academy B admin can access them → proves the IDs exist and the tenant boundary holds.
 *
 * Run: npx vitest run tests/cross-tenant-route.test.ts
 * Requires: dev server on localhost:3000
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";

// Supply synthetic fixture credentials/IDs at runtime; never commit secrets.
const ACADEMY_A_EMAIL = process.env.MYACADEMY_E2E_A_EMAIL ?? "";
const ACADEMY_A_PASSWORD = process.env.MYACADEMY_E2E_A_PASSWORD ?? "";
const ACADEMY_B_EMAIL = process.env.MYACADEMY_E2E_B_EMAIL ?? "";
const ACADEMY_B_PASSWORD = process.env.MYACADEMY_E2E_B_PASSWORD ?? "";
const ACADEMY_B_STUDENT_ID = process.env.MYACADEMY_E2E_B_STUDENT_ID ?? "";
const ACADEMY_B_GROUP_ID = process.env.MYACADEMY_E2E_B_GROUP_ID ?? "";
const FAKE_NONEXISTENT_ID = "00000000-0000-0000-0000-000000000999";
const HAS_E2E_FIXTURES = Boolean(
  ACADEMY_A_EMAIL && ACADEMY_A_PASSWORD && ACADEMY_B_EMAIL && ACADEMY_B_PASSWORD &&
  ACADEMY_B_STUDENT_ID && ACADEMY_B_GROUP_ID,
);

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return "";
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/ma_session=([^;]+)/);
  return match ? `ma_session=${match[1]}; myacademy_onboarding_done=1` : "";
}

function fetchWith(cookie: string, path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
}

describe.skipIf(!HAS_E2E_FIXTURES)("Route-Level Cross-Tenant — runtime fixtures", () => {
  let adminA: string;

  beforeAll(async () => {
    adminA = await login(ACADEMY_A_EMAIL, ACADEMY_A_PASSWORD);
    if (!adminA) throw new Error("Login failed — is the server running?");
  });

  // Control test: a non-existent ID returns 404 (this is expected for ANY system).
  it("CONTROL: non-existent ID returns 404 (baseline)", async () => {
    const res = await fetchWith(adminA, `/students/${FAKE_NONEXISTENT_ID}`);
    expect(res.status).toBe(404);
  });

  // The isolation test: Academy B's student exists in the fixture but Academy A must NOT see it.
  it("(students) Academy A cannot view Academy B's fixture student", async () => {
    const res = await fetchWith(adminA, `/students/${ACADEMY_B_STUDENT_ID}`);
    // MUST be 404 — the student exists but belongs to another academy.
    // If this returned 200, RLS is broken.
    // If this returned 404, we can't distinguish from "not found" —
    // but combined with the next test that verifies Academy B CAN see it,
    // we prove the 404 is due to RLS, not "doesn't exist".
    expect(res.status).toBe(404);
  });

  it("(groups) Academy A cannot view Academy B's fixture group", async () => {
    const res = await fetchWith(adminA, `/groups/${ACADEMY_B_GROUP_ID}`);
    expect(res.status).not.toBe(200);
  });

  it("(search) authenticated Academy A search succeeds and stays scoped", async () => {
    const res = await fetch(`${BASE}/api/search?q=BStudent`, {
      headers: { Cookie: adminA },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const ids = (data.results ?? []).map((r: any) => r.id);
    expect(ids).not.toContain(ACADEMY_B_STUDENT_ID);
  });

  it("(export) Academy A export has ZERO Academy B students", async () => {
    const res = await fetch(`${BASE}/api/export`, { headers: { Cookie: adminA } });
    expect(res.status).toBe(200);
    const data = await res.json();
    const bStudents = (data.students ?? []).filter((s: any) => s.first_name === "BStudent");
    expect(bStudents).toHaveLength(0);
  });

  it("(auth) logged-out gets redirected", async () => {
    const res = await fetch(`${BASE}/students`, { redirect: "manual" });
    expect(res.status).toBe(307);
  });

  it("(auth) wrong password rejected", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@myacademy.edu", password: "wrong" }),
    });
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});

// Verify Academy B admin CAN see its own fixture data (existence proof).
describe.skipIf(!HAS_E2E_FIXTURES)("Route-Level — Academy B sees own data (existence proof)", () => {
  let adminB: string;

  beforeAll(async () => {
    adminB = await login(ACADEMY_B_EMAIL, ACADEMY_B_PASSWORD);
    if (!adminB) throw new Error("Admin B login failed");
  });

  it("(existence) Academy B student EXISTS and Academy B admin CAN see it", async () => {
    const res = await fetchWith(adminB, `/students/${ACADEMY_B_STUDENT_ID}`);
    expect(res.status).toBe(200);
  });

  it("(existence) Academy B group EXISTS and Academy B admin CAN see it", async () => {
    const res = await fetchWith(adminB, `/groups/${ACADEMY_B_GROUP_ID}`);
    expect(res.status).toBe(200);
  });
});
