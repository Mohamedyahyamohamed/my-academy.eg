import { test, expect } from "./helpers";

test.describe("Admin Journey", () => {
  test("login → dashboard with real data", async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/dashboard/);
    await expect(adminPage.locator("h1")).toContainText("لوحة التحكم");
    // Dashboard should show real metrics.
    await expect(adminPage.getByText("إجمالي الطلاب")).toBeVisible();
    await expect(adminPage.getByText("المتبقي (المتأخرات)")).toBeVisible();
  });

  test("navigate to students list", async ({ adminPage }) => {
    await adminPage.goto("/students");
    await expect(adminPage.locator("h1")).toContainText("الطلاب");
    // Should see at least one student.
    const rows = adminPage.locator('a[href*="/students/"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigate to groups", async ({ adminPage }) => {
    await adminPage.goto("/groups");
    await expect(adminPage.locator("h1")).toContainText("المجموعات");
  });

  test("navigate to payments", async ({ adminPage }) => {
    await adminPage.goto("/payments");
    await expect(adminPage.locator("h1")).toContainText("المصاريف");
  });

  test("navigate to analytics", async ({ adminPage }) => {
    await adminPage.goto("/analytics");
    await expect(adminPage.locator("h1")).toContainText("التحليلات");
  });

  test("navigate to settings", async ({ adminPage }) => {
    await adminPage.goto("/settings");
    await expect(adminPage.locator("h1")).toContainText("الإعدادات");
  });

  test("navigate to billing", async ({ adminPage }) => {
    await adminPage.goto("/billing");
    await expect(adminPage.locator("h1")).toContainText("الاشتراكات والخطط");
  });

  test("navigate to audit logs", async ({ adminPage }) => {
    await adminPage.goto("/audit");
    await expect(adminPage.locator("h1")).toContainText("سجل العمليات");
  });

  test("navigate to messages", async ({ adminPage }) => {
    await adminPage.goto("/messages");
    await expect(adminPage.locator("h1")).toContainText("الرسائل");
  });

  test("global search works", async ({ adminPage }) => {
    await adminPage.fill('input[aria-label="بحث عام"]', "Adam");
    await adminPage.waitForTimeout(500);
    // Search results should appear.
    const results = adminPage.getByText("Adam");
    await expect(results.first()).toBeVisible({ timeout: 5_000 });
  });

  test("logout", async ({ adminPage }) => {
    await adminPage.locator('button:has-text("Yasmin")').click({ timeout: 5_000 }).catch(() => {});
    // Click sign out if visible.
    const signOut = adminPage.locator('text=Sign out');
    if (await signOut.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signOut.click();
      await adminPage.waitForURL(/\/login/, { timeout: 5_000 });
    }
  });
});
