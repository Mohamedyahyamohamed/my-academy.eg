/**
 * GET /api/whatsapp/test?to=2010xxxxxxxx
 * يرسل رسالة واتساب تجريبية للتحقق من ضبط المفاتيح.
 * - لو مضبوط WHATSAPP_NOTIFICATION_TEMPLATE → يبعت القالب بنص تجريبي.
 * - وإلا → يبعت نصًا حرًا (يعمل ضمن نافذة 24 ساعة أو لرقم الاختبار المعتمد).
 * يتطلب صلاحية ADMIN.
 *
 * ملاحظة: قالب hello_world يعمل فقط من رقم الاختبار العام (Public Test Number)،
 * ولذلك لن يعمل من رقم الإنتاج المسجّل.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services";
import {
  isWhatsAppConfigured,
  normalizePhoneE164,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    requireRole("ADMIN");
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      },
      { status: 500 },
    );
  }

  const to = req.nextUrl.searchParams.get("to") || "";
  const number = normalizePhoneE164(to);
  if (!number) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'to' phone number." },
      { status: 400 },
    );
  }

  const templateName = process.env.WHATSAPP_NOTIFICATION_TEMPLATE || "academy_notice";
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "ar";

  // استخدم القالب المعتمد مع اسم تجريبي كمتحول {{1}}.
  const res = await sendWhatsAppTemplate(to, templateName, lang, [
    { type: "body", parameters: [{ type: "text", text: "رسالة تجريبية" }] },
  ]);
  return NextResponse.json({ to: number, template: templateName, ...res });
}
