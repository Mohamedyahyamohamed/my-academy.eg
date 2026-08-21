/**
 * Route-level tenant isolation smoke tests.
 *
 * The suite starts the real Next.js app locally with its deterministic A/B seed,
 * creates signed Administrator sessions, and exercises authenticated HTTP routes.
 * It deliberately does not use passwords or production data. Production evidence
 * remains documented separately in verification/.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createSignedSession } from "@/lib/session-cookie";
import type { SessionUser } from "@/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PORT = 3217;
const BASE = `http://127.0.0.1:${PORT}`;
const ACADEMY_A_ID = "academy-1";
const ACADEMY_B_ID = "academy-b";
const B_STUDENT_ID = "7946a8cf-2497-4614-820e-6e2603d1f3fa";
const B_GROUP_ID = "fa7c6506-e822-480a-9d5b-eabe6effb097";
const FAKE_NONEXISTENT_ID = "00000000-0000-0000-0000-000000000999";

const adminA: SessionUser = {
  id: "prof-admin",
  email: "admin@myacademy.edu",
  role: "ADMIN",
  full_name: "Yasmin Hassan",
  avatar_url: null,
  academy_id: ACADEMY_A_ID,
};
const adminB: SessionUser = {
  id: "prof-admin-b",
  email: "admin-b@test.com",
  role: "ADMIN",
  full_name: "Academy B Admin",
  avatar_url: null,
  academy_id: ACADEMY_B_ID,
};

let server: ChildProcess | undefined;
let cookieA = "";
let cookieB = "";

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (response.status < 500) return;
      lastError = `health status ${response.status}`;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local Next.js server did not become ready: ${lastError}`);
}

function fetchWith(cookie: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookie);
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
}

async function responseJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return null; }
}

describe("Route-Level Cross-Tenant — authenticated local runtime", () => {
  beforeAll(async () => {
    server = spawn("pnpm", ["dev", "-p", String(PORT)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "development",
        SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        SUPABASE_KEY: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
      stdio: "ignore",
    });
    await waitForServer();
    cookieA = `ma_session=${createSignedSession(adminA)}; myacademy_onboarding_done=1`;
    cookieB = `ma_session=${createSignedSession(adminB)}; myacademy_onboarding_done=1`;
  }, 120_000);

  afterAll(() => {
    if (server && !server.killed) server.kill("SIGTERM");
  });

  it("CONTROL: a non-existent ID produces no search result", async () => {
    const response = await fetchWith(cookieA, `/api/search?q=${FAKE_NONEXISTENT_ID}`);
    expect(response.status).toBe(200);
    const data = await responseJson(response);
    expect(data?.results ?? []).toHaveLength(0);
  });

  it("students: Academy A search cannot return Academy B student, while B can", async () => {
    const denied = await fetchWith(cookieA, "/api/search?q=BStudent");
    expect(denied.status).toBe(200);
    const deniedData = await responseJson(denied);
    expect((deniedData?.results ?? []).some((result: any) => result.id === B_STUDENT_ID)).toBe(false);
    const allowed = await fetchWith(cookieB, "/api/search?q=BStudent");
    expect(allowed.status).toBe(200);
    const allowedData = await responseJson(allowed);
    expect((allowedData?.results ?? []).some((result: any) => result.id === B_STUDENT_ID)).toBe(true);
  });

  it("groups: Academy A search cannot return Academy B group, while B can", async () => {
    const denied = await fetchWith(cookieA, "/api/search?q=Academy%20B%20Test%20Group");
    expect(denied.status).toBe(200);
    const deniedData = await responseJson(denied);
    expect((deniedData?.results ?? []).some((result: any) => result.id === B_GROUP_ID)).toBe(false);
    const allowed = await fetchWith(cookieB, "/api/search?q=Academy%20B%20Test%20Group");
    expect(allowed.status).toBe(200);
    const allowedData = await responseJson(allowed);
    expect((allowedData?.results ?? []).some((result: any) => result.id === B_GROUP_ID)).toBe(true);
  });

  it("search: authenticated Academy A receives no Academy B fixture result", async () => {
    const response = await fetchWith(cookieA, "/api/search?q=BStudent");
    expect(response.status).toBe(200);
    const data = await responseJson(response);
    const ids = (data?.results ?? []).map((result: any) => result.id);
    expect(ids).not.toContain(B_STUDENT_ID);
  });

  it("export: Academy A export contains zero Academy B students", async () => {
    const response = await fetchWith(cookieA, "/api/export");
    expect(response.status).toBe(200);
    const data = await responseJson(response);
    const bStudents = (data?.students ?? []).filter((student: any) => student.id === B_STUDENT_ID);
    expect(bStudents).toHaveLength(0);
  });

  it("content file route: Academy A cannot download Academy B file", async () => {
    const response = await fetchWith(cookieA, "/api/content/files/395a8e30-44e8-437f-aa9c-2292acdfaf8c");
    expect([401, 403, 404]).toContain(response.status);
  });

  it("auth: logged-out access is redirected and wrong login is rejected", async () => {
    const loggedOut = await fetch(`${BASE}/students`, { redirect: "manual" });
    expect([307, 308]).toContain(loggedOut.status);
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-a-real-user@test.invalid", password: "not-used" }),
    });
    expect(login.status).toBe(401);
    const data = await responseJson(login);
    expect(data?.ok).toBe(false);
  });

  it("same-tenant API identity remains scoped in both directions", async () => {
    const aHealth = await fetchWith(cookieA, "/api/search?q=BStudent");
    const bHealth = await fetchWith(cookieB, "/api/search?q=BStudent");
    expect(aHealth.status).toBe(200);
    expect(bHealth.status).toBe(200);
    const aData = await responseJson(aHealth);
    const bData = await responseJson(bHealth);
    expect((aData?.results ?? []).some((result: any) => result.id === B_STUDENT_ID)).toBe(false);
    expect((bData?.results ?? []).some((result: any) => result.id === B_STUDENT_ID)).toBe(true);
  });
});
