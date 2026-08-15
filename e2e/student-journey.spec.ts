import { test, expect } from "./helpers";

test.describe("Student Journey", () => {
  test("login → student dashboard", async ({ studentPage }) => {
    await expect(studentPage).toHaveURL(/\/student/);
    await expect(studentPage.locator("text=النقاط").or(studentPage.locator("text=الحضور"))).toBeVisible({ timeout: 10_000 });
  });

  test("can view classes", async ({ studentPage }) => {
    await studentPage.goto("/student/classes");
    await expect(studentPage.locator("h1")).toContainText("حصصي");
  });

  test("can view lessons", async ({ studentPage }) => {
    await studentPage.goto("/student/lessons");
    await expect(studentPage.locator("h1")).toContainText("الحصص");
  });

  test("can view homework", async ({ studentPage }) => {
    await studentPage.goto("/student/homework");
    await expect(studentPage.locator("h1")).toContainText("الواجبات");
  });

  test("can view grades", async ({ studentPage }) => {
    await studentPage.goto("/student/grades");
    await expect(studentPage.getByRole("heading", { name: "الدرجات" })).toBeVisible({ timeout: 5_000 });
  });

  test("can view progress", async ({ studentPage }) => {
    await studentPage.goto("/student/progress");
    await expect(studentPage.locator("h1")).toContainText("التقدم");
  });

  test("has QR card button", async ({ studentPage }) => {
    await expect(studentPage.locator("text=QR")).toBeVisible({ timeout: 5_000 });
  });

  test("cannot access admin dashboard", async ({ studentPage }) => {
    await studentPage.goto("/dashboard");
    await expect(studentPage).not.toHaveURL(/\/dashboard/);
  });

  test("cannot access teacher page", async ({ studentPage }) => {
    await studentPage.goto("/teacher");
    await expect(studentPage).not.toHaveURL(/\/teacher/);
  });
});


test.describe("Student Educational Content", () => {
  test("can view educational content", async ({ studentPage }) => {
    await studentPage.goto("/student/content");
    await expect(studentPage.locator("h1")).toContainText("المحتوى التعليمي");
  });

  test("cannot open teacher content management", async ({ studentPage }) => {
    await studentPage.goto("/teacher/content");
    await expect(studentPage).not.toHaveURL(/\/teacher\/content/);
  });
});
