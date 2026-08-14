import Link from "next/link";
import { CalendarClock, CircleAlert, GraduationCap } from "lucide-react";
import { getAcademyInvitePreview } from "@/app/actions/invites";
import { InviteAcceptanceForm } from "@/components/invites/invite-acceptance-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InviteAcceptancePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const invite = await getAcademyInvitePreview(params.token);

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10" dir="rtl">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="items-center">
            <div className="mb-2 rounded-full bg-destructive/10 p-3 text-destructive"><CircleAlert className="h-7 w-7" /></div>
            <CardTitle>رابط الدعوة غير متاح</CardTitle>
            <CardDescription className="leading-6">
              قد يكون الرابط منتهي الصلاحية، تم استخدامه سابقًا، أو ألغته إدارة الأكاديمية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full"><Link href="/login">الانتقال إلى تسجيل الدخول</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const expiresAt = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(invite.expiresAt));

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10" dir="rtl">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto rounded-2xl bg-primary p-3 text-primary-foreground"><GraduationCap className="h-8 w-8" /></div>
          <div>
            <CardTitle className="text-2xl">أهلًا بك في {invite.academyName}</CardTitle>
            <CardDescription className="mt-2">أكمل بياناتك لتفعيل حسابك الآمن على MY Academy.</CardDescription>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4" />تنتهي الدعوة في {expiresAt}</p>
        </CardHeader>
        <CardContent>
          <InviteAcceptanceForm token={params.token} invite={invite} />
          <p className="mt-5 text-center text-xs text-muted-foreground">لديك حساب بالفعل؟ <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">سجّل الدخول أولًا</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
