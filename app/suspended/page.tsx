import Link from "next/link";
import { AlertTriangle, ArrowLeft, CreditCard, ShieldOff } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Reason = "academy_suspended" | "subscription_past_due" | "subscription_expired";

export default async function SuspendedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const reason = (await searchParams).reason as Reason | undefined;
  const manual = reason === "academy_suspended";
  const expired = reason === "subscription_expired";

  const title = manual
    ? en ? "Workspace temporarily suspended" : "تم إيقاف مساحة العمل مؤقتًا"
    : expired
      ? en ? "Subscription expired" : "انتهى الاشتراك"
      : en ? "Payment required to continue" : "يلزم تحديث الدفع لاستمرار الخدمة";
  const description = manual
    ? en ? "The platform owner has paused this workspace. Your data is preserved and access will return when the workspace is activated."
      : "قام مالك المنصة بإيقاف مساحة العمل مؤقتًا. بياناتك محفوظة بالكامل وستعود الخدمة عند إعادة التفعيل."
    : expired
      ? en ? "The subscription is no longer active. Please contact the platform owner or update the subscription to restore access."
        : "الاشتراك لم يعد نشطًا. تواصل مع مالك المنصة أو حدّث الاشتراك لاستعادة الوصول."
      : en ? "The latest subscription payment is overdue. Please settle the payment or contact the platform owner."
        : "يوجد مبلغ مستحق على الاشتراك. يرجى إتمام الدفع أو التواصل مع مالك المنصة.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" dir={en ? "ltr" : "rtl"}>
      <Card className="w-full max-w-xl shadow-lg">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            {manual ? <ShieldOff className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="leading-7 text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            {en ? "No records, students, teachers, or payments were deleted." : "لم يتم حذف أي سجلات أو طلاب أو مدرسين أو مدفوعات."}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/login"><ArrowLeft className="me-2 h-4 w-4" />{en ? "Back to login" : "العودة لتسجيل الدخول"}</Link>
            </Button>
            {!manual && <Button asChild variant="outline"><Link href="/billing"><CreditCard className="me-2 h-4 w-4" />{en ? "Open billing" : "فتح الفوترة"}</Link></Button>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
