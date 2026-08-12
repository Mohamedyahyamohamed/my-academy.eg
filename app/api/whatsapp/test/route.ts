/**
 * GET /api/whatsapp/test?to=2010xxxxxxxx
 * يرسل رسالة واتساب تجريبية (قالب hello_world) للتحقق من ضبط المفاتيح.
 * يتطلب صلاحية ADMIN.
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

  const res = await sendWhatsAppTemplate(to, "hello_world", "en_US");
  return NextResponse.json({ to: number, ...res });
}
