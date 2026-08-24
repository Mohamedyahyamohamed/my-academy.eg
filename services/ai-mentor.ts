import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types";

export const AI_MENTOR_SYSTEM_PROMPT =
  "You are an expert AI Coding Mentor for preparatory and secondary school students learning Python and Computer Science. Do NOT provide direct code solutions. Use the Socratic method. Point out syntax errors, explain concepts simply in Arabic, and ask guiding questions to help the student find the solution themselves.";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const askAIMentorInput = z.object({
  prompt: z.string().trim().min(1, "اكتب سؤالك أولاً.").max(8000, "السؤال طويل جدًا."),
  history: z.array(historyMessageSchema).max(8).default([]),
});

export type AskAIMentorInput = z.infer<typeof askAIMentorInput>;

export interface AIChatLog {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
}

async function resolveStudentId(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, user: SessionUser) {
  const { data, error } = await client
    .from("students")
    .select("id")
    .eq("academy_id", user.academy_id)
    .ilike("email", user.email)
    .maybeSingle();

  if (error) throw new Error(`تعذر التحقق من ملف الطالب: ${error.message}`);
  if (!data?.id) throw new Error("حسابك غير مرتبط بسجل طالب في الأكاديمية.");
  return data.id as string;
}

function buildPrompt(input: AskAIMentorInput) {
  const context = input.history
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Student" : "Mentor"}: ${message.content}`)
    .join("\n\n");

  return context
    ? `Previous conversation:\n${context}\n\nStudent's new question:\n${input.prompt}`
    : input.prompt;
}

export async function askAIMentorForStudent(user: SessionUser, rawInput: AskAIMentorInput) {
  if (user.role !== "STUDENT") throw new Error("هذه الخدمة متاحة للطلاب فقط.");

  const input = askAIMentorInput.parse(rawInput);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("خدمة الموجّه الذكي غير مهيأة حاليًا.");

  const client = await createServerSupabaseClient();
  const studentId = await resolveStudentId(client, user);
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: AI_MENTOR_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(buildPrompt(input));
  const response = result.response.text().trim();
  if (!response) throw new Error("لم يُرجع الموجّه الذكي ردًا صالحًا.");

  const { data: log, error: logError } = await client
    .from("ai_chat_logs")
    .insert({
      academy_id: user.academy_id,
      student_id: studentId,
      prompt: input.prompt,
      response,
    })
    .select("id,prompt,response,created_at")
    .single();

  if (logError || !log) throw new Error(`تعذر حفظ سجل المحادثة: ${logError?.message ?? "unknown error"}`);
  return log as AIChatLog;
}

export async function getAIMentorLogsForStudent(user: SessionUser, limit = 30): Promise<AIChatLog[]> {
  if (user.role !== "STUDENT") return [];
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("ai_chat_logs")
    .select("id,prompt,response,created_at")
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (error) throw new Error(`تعذر تحميل سجل الموجّه: ${error.message}`);
  return (data ?? []) as AIChatLog[];
}
