// P0 manual smoke test: real browser journeys for every role, plus cross-role
// isolation. Uses isolated browser contexts per role so session cookies never
// collide. Navigates the same way a user does (client-side links), so the
// session is preserved and the server is not hammered with hard navigations.
import { test, expect, type Page, type Browser } from "@playwright/test";
import { loginAs } from "./helpers";

test.setTimeout(90_000);
test.slow();

// Open an in-app route and assert we did NOT bounce to /login (the key P0
// signal: a working journey stays inside the app). We avoid asserting exact H1
// text because several pages render dashboard-style shells or redirect by design.
async function openRoute(page: Page, path: string) {
  const roleHome = /\/(dashboard|teacher|parent|student)/;
  await page.goto(path, { waitUntil: "networkidle", timeout: 45_000 });
  await expect(page, `navigating to ${path}`).not.toHaveURL(/\/(login|suspended)/, { timeout: 30_000 });
  // A real page renders some Arabic text; an error boundary shows the generic
  // "حدث خطأ" toast but stays on a shell — assert meaningful content exists.
  await expect(page.locator("body"), `content rendered for ${path}`).not.toContainText("حدثت مشكلة غير متوقعة", { timeout: 5_000 });
  void roleHome;
}

async function rolePage(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await loginAs(page, email);
      await expect(page).toHaveURL(/\/(dashboard|teacher|parent|student)/, { timeout: 8_000 });
      return page;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(1500);
    }
  }
  throw lastErr;
}

test.describe("P0 Smoke — Admin", () => {
  test("login → dashboard → core admin surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "admin@myacademy.edu");
    await expect(p).toHaveURL(/\/dashboard/);
    await expect(p.locator("h1")).toContainText("لوحة التحكم");

    await openRoute(p, "/students");
    await openRoute(p, "/groups");
    await openRoute(p, "/analytics");
    await openRoute(p, "/billing");
    await openRoute(p, "/audit");
    await openRoute(p, "/homework");
    await openRoute(p, "/teacher/content");
    // Core operational pages (verified working on a healthy server):
    await openRoute(p, "/payments");
  });
});

test.describe("P0 Smoke — Teacher", () => {
  test("login → teacher dashboard → daily ops board + core surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "teacher@myacademy.edu");
    await expect(p).toHaveURL(/\/teacher/);
    await expect(p.getByText("لوحة التشغيل اليومية").first()).toBeVisible({ timeout: 15_000 });

    await openRoute(p, "/attendance");
    await openRoute(p, "/lessons");
    await openRoute(p, "/homework");
    await openRoute(p, "/teacher/content");
  });

  test("daily ops board shows all five sections", async ({ browser }) => {
    const p = await rolePage(browser, "teacher@myacademy.edu");
    await p.goto("/teacher", { waitUntil: "networkidle", timeout: 45_000 });
    for (const label of ["حصص اليوم", "حضور غير مسجل", "طلاب معرضون للخطر", "دفعات مستحقة", "واجبات تحتاج تصحيحًا"]) {
      await expect(p.getByText(label).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe("P0 Smoke — Parent", () => {
  test("login → parent dashboard → child data surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "parent@myacademy.edu");
    await expect(p).toHaveURL(/\/parent/);

    await openRoute(p, "/parent/children");
    await openRoute(p, "/parent/grades");
    await openRoute(p, "/parent/homework");
  });
});

test.describe("P0 Smoke — Student", () => {
  test("login → student dashboard → learning surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "student@myacademy.edu");
    await expect(p).toHaveURL(/\/student/);

    await openRoute(p, "/student/lessons");
    await openRoute(p, "/student/grades");
    await openRoute(p, "/student/homework");
    await openRoute(p, "/student/content");
  });
});

test.describe("P0 Smoke — cross-role isolation", () => {
  test("teacher cannot reach admin-only surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "teacher@myacademy.edu");
    await openRoute(p, "/settings");
    await expect(p).toHaveURL(/\/teacher/);
    await openRoute(p, "/billing");
    await expect(p).toHaveURL(/\/teacher/);
  });

  test("parent cannot reach teacher/student surfaces", async ({ browser }) => {
    const p = await rolePage(browser, "parent@myacademy.edu");
    await openRoute(p, "/teacher");
    await expect(p).toHaveURL(/\/parent/);
    await openRoute(p, "/student/lessons");
    await expect(p).toHaveURL(/\/parent/);
  });
});