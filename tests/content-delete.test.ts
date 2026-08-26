import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const action = readFileSync(resolve(process.cwd(), "app/actions/content.ts"), "utf8");
const buttons = readFileSync(resolve(process.cwd(), "components/content/content-delete-buttons.tsx"), "utf8");
const lessonPage = readFileSync(resolve(process.cwd(), "app/(app)/teacher/content/[courseId]/lessons/[lessonId]/page.tsx"), "utf8");
const coursePage = readFileSync(resolve(process.cwd(), "app/(app)/teacher/content/[courseId]/page.tsx"), "utf8");

describe("content deletion contract", () => {
  it("exposes file and lesson delete actions with teacher/admin scope", () => {
    expect(action).toContain("export async function deleteContentFileAction");
    expect(action).toContain("export async function deleteContentLessonAction");
    expect(action).toContain('requireScopedRole("TEACHER", "ADMIN")');
    expect(action).toContain("Assistant accounts cannot delete content files.");
    expect(action).toContain("Assistant accounts cannot delete lessons.");
  });

  it("removes Storage objects before deleting their database records", () => {
    const storageIndex = action.indexOf('client.storage.from("content").remove');
    const registryIndex = action.indexOf('client.from("content_files").delete');
    expect(storageIndex).toBeGreaterThan(-1);
    expect(registryIndex).toBeGreaterThan(storageIndex);
    expect(action).toContain("Lesson files could not be removed. The lesson was kept.");
  });

  it("renders confirmed delete controls for both a file and its lesson", () => {
    expect(buttons).toContain("DeleteContentFileButton");
    expect(buttons).toContain("DeleteContentLessonButton");
    expect(buttons).toContain("ConfirmDialog");
    expect(lessonPage).toContain("DeleteContentLessonButton");
    expect(lessonPage).toContain("DeleteContentFileButton");
    expect(coursePage).toContain("DeleteContentLessonButton");
  });
});
