import { test as base, expect, type Page } from "@playwright/test";

const DEMO_PASSWORDS: Record<string, string> = {
  "admin@myacademy.edu": "demo1234",
  "teacher@myacademy.edu": "teacher1234",
  "parent@myacademy.edu": "parent1234",
  "student@myacademy.edu": "student1234",
};

// Login helper — fills the login form and submits.
export async function loginAs(page: Page, email: string, password?: string) {
  const resolvedPassword = password ?? DEMO_PASSWORDS[email.toLowerCase()] ?? "demo1234";
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', resolvedPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|teacher|parent|student)/, { timeout: 10_000 });
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
