import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Home, SearchX } from "lucide-react";
import { LANG_COOKIE, getLangFromCookie } from "@/lib/i18n";

export default async function NotFound() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const en = lang === "en";

  return (
    <main
      dir={en ? "ltr" : "rtl"}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900"
    >
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-500">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {en ? "Page not found" : "الصفحة غير موجودة"}
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
          {en
            ? "The link may be outdated or the page may have moved. Return to MY Academy and continue from there."
            : "الرابط قد يكون قديمًا أو أن الصفحة نُقلت. ارجع إلى MY Academy وتابع من هناك."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {en ? "Back to home" : "العودة للرئيسية"}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

export const dynamic = "force-dynamic";
