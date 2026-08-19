import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ConsentPendingPage() {
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-10" dir={en ? "ltr" : "rtl"}>
      <section className="w-full rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">MYAcademy</p>
        <h1 className="mt-2 text-2xl font-semibold">{en ? "Waiting for parental consent" : "في انتظار موافقة ولي الأمر"}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {en
            ? "Your student account was created but remains inactive. Ask your parent or guardian to approve the separate consent link provided by the academy."
            : "تم إنشاء حساب الطالب، لكنه يظل غير مفعّل. اطلب من ولي أمرك اعتماد رابط الموافقة المنفصل الذي توفره الأكاديمية."}
        </p>
      </section>
    </main>
  );
}
