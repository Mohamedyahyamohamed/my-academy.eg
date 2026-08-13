import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "@/services/supabase/config";
import type { SessionUser } from "@/types";

export type SupportCategory = "ONBOARDING" | "BILLING" | "TECHNICAL" | "DATA" | "OTHER";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface SupportTicket {
  id: string;
  academy_id: string;
  requester_profile_id: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: "LOW" | "NORMAL" | "HIGH";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CreateSupportTicketInput {
  category: SupportCategory;
  subject: string;
  description: string;
}

const categories: SupportCategory[] = ["ONBOARDING", "BILLING", "TECHNICAL", "DATA", "OTHER"];

function normalize(input: CreateSupportTicketInput) {
  const subject = input.subject.trim().replace(/\s+/g, " ");
  const description = input.description.trim();
  if (!categories.includes(input.category)) throw new Error("نوع طلب الدعم غير صالح.");
  if (subject.length < 4 || subject.length > 140) throw new Error("عنوان الطلب يجب أن يتراوح بين 4 و140 حرفًا.");
  if (description.length < 10 || description.length > 4000) throw new Error("اشرح المشكلة في 10 إلى 4000 حرف.");
  return { category: input.category, subject, description };
}

export async function listSupportTickets(user: SessionUser): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured()) return [];
  const client = nodeSupabaseClient();
  if (!client || !user.academy_id) return [];

  let query = client
    .from("support_tickets")
    .select("id, academy_id, requester_profile_id, category, subject, description, status, priority, created_at, updated_at, resolved_at")
    .eq("academy_id", user.academy_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Academy admins may follow tickets opened by their staff; every other role
  // sees only the requests it created.
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    query = query.eq("requester_profile_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    // The UI must remain usable while the migration is awaiting application.
    if (error.code === "42P01") return [];
    throw new Error("تعذر تحميل طلبات الدعم الآن.");
  }
  return (data ?? []) as SupportTicket[];
}

export async function createSupportTicket(
  user: SessionUser,
  input: CreateSupportTicketInput,
): Promise<SupportTicket> {
  if (!isSupabaseConfigured()) {
    throw new Error("نظام التذاكر غير متاح في وضع العرض. استخدم مركز المساعدة أولًا.");
  }
  if (!user.id || !user.academy_id) throw new Error("تعذر التحقق من سياق الأكاديمية.");

  const client = nodeSupabaseClient();
  if (!client) throw new Error("إعداد خدمة الدعم غير مكتمل.");
  const clean = normalize(input);
  const { data, error } = await client
    .from("support_tickets")
    .insert({
      academy_id: user.academy_id,
      requester_profile_id: user.id,
      category: clean.category,
      subject: clean.subject,
      description: clean.description,
      status: "OPEN",
      priority: "NORMAL",
    })
    .select("id, academy_id, requester_profile_id, category, subject, description, status, priority, created_at, updated_at, resolved_at")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error("نظام الدعم قيد الإعداد. طبّق migration تذاكر الدعم أولًا.");
    }
    throw new Error("تعذر إرسال طلب الدعم. حاول مرة أخرى.");
  }
  return data as SupportTicket;
}
