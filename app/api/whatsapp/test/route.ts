/**
 * POST /api/whatsapp/test
 * Body: { "to": "2010xxxxxxxx" }
 *
 * نقطة تشخيص محمية للمدير فقط. لا تعمل إلا عند ضبط:
 * WHATSAPP_MODE=live وWHATSAPP_ALLOW_TEST_SEND=true.
 * يوقف المالك المتغير الثاني بعد اكتمال الاختبار.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services";
import {
  isWhatsAppLiveEnabled,
  normalizePhoneE164,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    requireRole("ADMIN");
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppLiveEnabled() || process.env.WHATSAPP_ALLOW_TEST_SEND !== "true") {
    return NextResponse.json(
      { ok: false, error: "WhatsApp test sending is disabled." },
      { status: 403 },
    );
  }

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const to = body.to || "";
  const number = normalizePhoneE164(to);
  if (!number) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid recipient phone number." },
      { status: 400 },
    );
  }

  const templateName = process.env.WHATSAPP_NOTIFICATION_TEMPLATE;
  if (!templateName) {
    return NextResponse.json(
      { ok: false, error: "No approved notification template is configured." },
      { status: 400 },
    );
  }
  const language = process.env.WHATSAPP_TEMPLATE_LANG || "ar";
  const result = await sendWhatsAppTemplate(to, templateName, language, [
    { type: "body", parameters: [{ type: "text", text: "رسالة تجريبية" }] },
  ]);
  return NextResponse.json({ to: number, template: templateName, ...result });
}
