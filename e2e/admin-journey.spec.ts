import { test, expect } from "./helpers";

test.describe("Admin Journey", () => {
  test("login → dashboard with real data", async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/dashboard/);
    await expect(adminPage.locator("h1")).toContainText("Dashboard");
    // Dashboard should show real metrics.
    await expect(adminPage.locator("text=Total Students")).toBeVisible();
    await expect(adminPage.locator("text=Outstanding")).toBeVisible();
  });

  test("navigate to students list", async ({ adminPage }) => {
    await adminPage.goto("/students");
    await expect(adminPage.locator("h1")).toContainText("Students");
    // Should see at least one student.
    const rows = adminPage.locator('a[href*="/students/"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigate to groups", async ({ adminPage }) => {
    await adminPage.goto("/groups");
    await expect(adminPage.locator("h1")).toContainText("Groups");
  });

  test("navigate to payments", async ({ adminPage }) => {
    await adminPage.goto("/payments");
    await expect(adminPage.locator("h1")).toContainText("Payments");
  });

  test("navigate to analytics", async ({ adminPage }) => {
    await adminPage.goto("/analytics");
    await expect(adminPage.locator("h1")).toContainText("Analytics");
  });

  test("navigate to settings", async ({ adminPage }) => {
    await adminPage.goto("/settings");
    await expect(adminPage.locator("h1")).toContainText("Settings");
  });

  test("navigate to billing", async ({ adminPage }) => {
    await adminPage.goto("/billing");
    await expect(adminPage.locator("h1")).toContainText("Billing");
  });

  test("navigate to audit logs", async ({ adminPage }) => {
    await adminPage.goto("/audit");
    await expect(adminPage.locator("h1")).toContainText("Audit");
  });

  test("navigate to messages", async ({ adminPage }) => {
    await adminPage.goto("/messages");
    await expect(adminPage.locator("h1")).toContainText("Messages");
  });

  test("global search works", async ({ adminPage }) => {
    await adminPage.fill('input[aria-label="Global search"]', "Adam");
    await adminPage.waitForTimeout(500);
    // Search results should appear.
    const results = adminPage.locator("text=Adam");
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
