import { test as base, expect, type Page } from "@playwright/test";

const DEMO_PASSWORDS: Record<string, string> = {
  "admin@myacademy.edu": "demo1234",
  "teacher@myacademy.edu": "demo1234",
  "parent@myacademy.edu": "demo1234",
  "student@myacademy.edu": "demo1234",
};

// Login helper — hits the auth API through the context request (so the session
// cookie is stored on the browser context automatically), then navigates home.
export async function loginAs(page: Page, email: string, password?: string) {
  const resolvedPassword = password ?? DEMO_PASSWORDS[email.toLowerCase()] ?? "demo1234";
  const api = page.context().request;
  const base = process.env.E2E_BASE_URL || "http://localhost:3000";
  const res = await api.post(`${base}/api/auth/login`, {
    headers: { "Content-Type": "application/json" },
    data: { email, password: resolvedPassword },
  });
  if (!res.ok()) {
    throw new Error(`login failed for ${email}: ${res.status()}`);
  }
  const roleHome =
    email.startsWith("admin") ? "/dashboard" : email.startsWith("teacher") ? "/teacher" : email.startsWith("parent") ? "/parent" : "/student";
  await page.goto(roleHome, { waitUntil: "domcontentloaded" });
  await page.waitForURL(roleHome, { timeout: 30_000 });
}

// Extended test fixture with login helpers.
export const test = base.extend<{
  adminPage: Page;
  teacherPage: Page;
  parentPage: Page;
  studentPage: Page;
}>({
  adminPage: async ({ page }, use) => {
    await loginAs(page, "admin@myacademy.edu");
    await use(page);
  },
  teacherPage: async ({ page }, use) => {
    await loginAs(page, "teacher@myacademy.edu");
    await use(page);
  },
  parentPage: async ({ page }, use) => {
    await loginAs(page, "parent@myacademy.edu");
    await use(page);
  },
  studentPage: async ({ page }, use) => {
    await loginAs(page, "student@myacademy.edu");
    await use(page);
  },
});

export { expect };
