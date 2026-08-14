import { test, expect } from "./helpers";

test.describe("Security E2E", () => {
  // ─── Cross-Tenant Isolation ───────────────────────────────────────
  test("(cross-tenant) Admin A cannot view Academy B student", async ({ adminPage }) => {
    // Academy B student ID from the deterministic local E2E fixture.
    const response = await adminPage.goto("/students/7946a8cf-2497-4614-820e-6e2603d1f3fa");
    expect(response?.status()).toBe(404);
  });

  test("(cross-tenant) Admin A cannot view Academy B group", async ({ adminPage }) => {
    const response = await adminPage.goto("/groups/fa7c6506-e822-480a-9d5b-eabe6effb097");
    expect(response?.status()).not.toBe(200);
  });

  // ─── Direct URL Authorization ──────────────────────────────────────
  test("(auth) logged-out user redirected from /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("(auth) logged-out user redirected from /students", async ({ page }) => {
    await page.goto("/students");
    await expect(page).toHaveURL(/\/login/);
  });

  test("(auth) logged-out user redirected from /payments", async ({ page }) => {
    await page.goto("/payments");
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── Role Escalation ──────────────────────────────────────────────
  test("(escalation) student cannot access /settings", async ({ studentPage }) => {
    await studentPage.goto("/settings");
    await expect(studentPage).not.toHaveURL(/\/settings/);
  });

  test("(escalation) parent cannot access /settings", async ({ parentPage }) => {
    await parentPage.goto("/settings");
    await expect(parentPage).not.toHaveURL(/\/settings/);
  });

  test("(escalation) teacher cannot access /billing", async ({ teacherPage }) => {
    await teacherPage.goto("/billing");
    await expect(teacherPage).not.toHaveURL(/\/billing/);
  });

  test("(escalation) teacher cannot access academy payments", async ({ teacherPage }) => {
    await teacherPage.goto("/payments");
    await expect(teacherPage).toHaveURL(/\/teacher/);
  });

  test("(escalation) teacher cannot access academy settings", async ({ teacherPage }) => {
    await teacherPage.goto("/settings");
    await expect(teacherPage).toHaveURL(/\/teacher/);
  });

  test("(escalation) parent cannot access academy payments", async ({ parentPage }) => {
    await parentPage.goto("/payments");
    await expect(parentPage).toHaveURL(/\/parent/);
  });

  // ─── Unauthorized API ─────────────────────────────────────────────
  test("(api) search requires auth", async ({ page }) => {
    const res = await page.request.get("/api/search?q=test");
    expect(res.status()).toBe(401);
  });

  test("(api) export requires admin auth", async ({ page }) => {
    const res = await page.request.get("/api/export");
    // Should redirect (307) or 401 — not 200 with data.
    expect(res.status()).not.toBe(200);
  });

  // ─── Data Export Security ─────────────────────────────────────────
  test("(export) admin export returns valid JSON with academy-scoped data", async ({ adminPage }) => {
    const res = await adminPage.request.get("/api/export");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.students).toBeDefined();
    // Verify the Academy A export contains no Academy B fixture student.
    const bStudents = (data.students ?? []).filter((s: any) => s.first_name === "BStudent");
    expect(bStudents).toHaveLength(0);
  });

  test("(export) teacher cannot export", async ({ teacherPage }) => {
    const res = await teacherPage.request.get("/api/export");
    expect(res.status()).not.toBe(200);
  });

  test("(export) parent cannot export", async ({ parentPage }) => {
    const res = await parentPage.request.get("/api/export");
    expect(res.status()).not.toBe(200);
  });

  test("(export) student cannot export", async ({ studentPage }) => {
    const res = await studentPage.request.get("/api/export");
    expect(res.status()).not.toBe(200);
  });

  // ─── Login Security ───────────────────────────────────────────────
  test("(auth) wrong password rejected", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="email"]', "admin@myacademy.edu");
    await page.fill('input[id="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    // Should stay on login page (not redirect to dashboard).
    await expect(page).toHaveURL(/\/login/);
  });

  test("(auth) non-existent email rejected", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="email"]', "nobody@nowhere.com");
    await page.fill('input[id="password"]', "demo1234");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── Signup Rate Limiting ─────────────────────────────────────────
  test("(signup) signup page is accessible", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText("MYAcademy");
  });
});
