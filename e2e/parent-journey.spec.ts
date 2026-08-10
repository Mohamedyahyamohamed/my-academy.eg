import { test, expect } from "./helpers";

test.describe("Parent Journey", () => {
  test("login → parent dashboard with children", async ({ parentPage }) => {
    await expect(parentPage).toHaveURL(/\/parent/);
    // Should see children names.
    await expect(parentPage.locator("text=Adam")).toBeVisible({ timeout: 10_000 });
  });

  test("can view children list", async ({ parentPage }) => {
    await parentPage.goto("/parent/children");
    await expect(parentPage.locator("text=Children")).toBeVisible({ timeout: 5_000 });
  });

  test("can view attendance", async ({ parentPage }) => {
    await parentPage.goto("/parent/attendance");
    await expect(parentPage.locator("h1")).toContainText("Attendance");
  });

  test("can view grades", async ({ parentPage }) => {
    await parentPage.goto("/parent/grades");
    await expect(parentPage.locator("h1")).toContainText("Grades");
  });

  test("can view payments", async ({ parentPage }) => {
    await parentPage.goto("/parent/payments");
    await expect(parentPage.locator("h1")).toContainText("Payments");
  });

  test("cannot access admin dashboard", async ({ parentPage }) => {
    await parentPage.goto("/dashboard");
    await expect(parentPage).not.toHaveURL(/\/dashboard/);
  });

  test("cannot access students list", async ({ parentPage }) => {
    await parentPage.goto("/students");
    await expect(parentPage).not.toHaveURL(/\/students/);
  });
});
