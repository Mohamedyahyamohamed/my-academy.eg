import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { ConsentApprovalForm } from "./consent-approval-form";

export const dynamic = "force-dynamic";

export default async function ConsentPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-10" dir={en ? "ltr" : "rtl"}>
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-primary">MYAcademy</p>
        <h1 className="text-2xl font-semibold">{en ? "Parental consent" : "موافقة ولي الأمر"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {en
            ? "Review the academy's privacy and student-access terms, then enter the parent email registered by the academy to approve this student account."
            : "راجع سياسة الخصوصية وشروط وصول الطالب، ثم أدخل بريد ولي الأمر المسجل لدى الأكاديمية لاعتماد حساب الطالب."}
        </p>
        <ConsentApprovalForm token={token} en={en} />
      </section>
    </main>
  );
}
