import { test, expect } from "./helpers";

test.describe("Teacher Journey", () => {
  test("login → teacher dashboard", async ({ teacherPage }) => {
    await expect(teacherPage).toHaveURL(/\/teacher/);
    await expect(teacherPage.getByText("مجموعاتي").first()).toBeVisible({ timeout: 10_000 });
  });

  test("sees only own groups (not all)", async ({ teacherPage }) => {
    await teacherPage.goto("/groups");
    // Omar owns Math/Physics/Chemistry — should NOT see English Conversation.
    await expect(teacherPage.locator("text=English Conversation")).not.toBeVisible({ timeout: 5_000 });
    await expect(teacherPage.getByText("Grade 9 — Math A").first()).toBeVisible({ timeout: 5_000 });
  });

  test("can access attendance", async ({ teacherPage }) => {
    await teacherPage.goto("/attendance");
    await expect(teacherPage.locator("h1")).toContainText("الحضور");
  });

  test("can access grades", async ({ teacherPage }) => {
    await teacherPage.goto("/grades");
    await expect(teacherPage.locator("h1")).toContainText("الدرجات");
  });

  test("can access homework", async ({ teacherPage }) => {
    await teacherPage.goto("/homework");
    await expect(teacherPage.locator("h1")).toContainText("الواجبات");
  });

  test("cannot manage assistants", async ({ teacherPage }) => {
    await teacherPage.goto("/teacher/assistants");
    await expect(teacherPage).toHaveURL(/\/teacher$/);
  });

  test("cannot access admin settings", async ({ teacherPage }) => {
    await teacherPage.goto("/settings");
    await expect(teacherPage).toHaveURL(/\/teacher/);
  });

  test("cannot access admin billing", async ({ teacherPage }) => {
    await teacherPage.goto("/billing");
    await expect(teacherPage).not.toHaveURL(/\/billing/);
  });
});
