import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AI_MENTOR_SYSTEM_PROMPT, askAIMentorInput } from "@/services/ai-mentor";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608241200_ai_chat_logs.sql"), "utf8");
const service = readFileSync(resolve(process.cwd(), "services/ai-mentor.ts"), "utf8");
const action = readFileSync(resolve(process.cwd(), "app/actions/ai-mentor.ts"), "utf8");
const component = readFileSync(resolve(process.cwd(), "components/student/ai-mentor-chat.tsx"), "utf8");
const nav = readFileSync(resolve(process.cwd(), "lib/nav.tsx"), "utf8");

describe("AI Coding Mentor contract", () => {
  it("uses the required Socratic Arabic-mentor instruction", () => {
    expect(AI_MENTOR_SYSTEM_PROMPT).toContain("Do NOT provide direct code solutions");
    expect(AI_MENTOR_SYSTEM_PROMPT).toContain("Use the Socratic method");
    expect(AI_MENTOR_SYSTEM_PROMPT).toContain("explain concepts simply in Arabic");
    expect(AI_MENTOR_SYSTEM_PROMPT).toContain("ask guiding questions");
  });

  it("validates bounded student input and conversation history", () => {
    expect(askAIMentorInput.parse({ prompt: "ما معنى الحلقة for؟" }).prompt).toBe("ما معنى الحلقة for؟");
    expect(() => askAIMentorInput.parse({ prompt: "" })).toThrow();
    expect(() => askAIMentorInput.parse({ prompt: "x".repeat(8001) })).toThrow();
    expect(() => askAIMentorInput.parse({ prompt: "x", history: [{ role: "system", content: "bad" }] })).toThrow();
  });

  it("keeps Gemini and the database access server-side and student-scoped", () => {
    expect(service).toContain("process.env.GEMINI_API_KEY");
    expect(service).toContain('model: "gemini-2.5-flash"');
    expect(service).toContain('.from("ai_chat_logs")');
    expect(service).toContain("academy_id: user.academy_id");
    expect(service).toContain("student_id: studentId");
    expect(action).toContain('requireScopedRole("STUDENT")');
    expect(component).not.toContain("GEMINI_API_KEY");
  });

  it("creates strict self-only RLS with no direct update or delete policy", () => {
    expect(migration).toContain("alter table public.ai_chat_logs enable row level security");
    expect(migration).toContain("alter table public.ai_chat_logs force row level security");
    expect(migration).toContain("private.auth_academy_id()");
    expect(migration).toContain("private.auth_student_id(academy_id)");
    expect(migration).toContain("private.auth_has_academy_role");
    expect(migration).toContain("create policy ai_chat_logs_student_select");
    expect(migration).toContain("create policy ai_chat_logs_student_insert");
    expect(migration).not.toMatch(/create policy[^\n]+for (update|delete)/i);
  });

  it("exposes the mentor in the student navigation and renders Markdown", () => {
    expect(nav).toContain('titleAr: "الموجّه الذكي"');
    expect(nav).toContain('href: "/student/mentor"');
    expect(component).toContain("ReactMarkdown");
    expect(component).toContain("remarkGfm");
    expect(component).toContain("جاري التفكير...");
  });
});
