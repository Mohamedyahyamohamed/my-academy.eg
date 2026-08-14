"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/services/supabase/config";

function cleanRecoveryUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

export default function ResetPasswordPage() {
  const supabase = React.useMemo(
    () => (isSupabaseConfigured() ? createBrowserSupabaseClient() : null),
    [],
  );
  const [checking, setChecking] = React.useState(true);
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [updated, setUpdated] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    let initialized = false;

    if (!supabase) {
      setChecking(false);
      return () => {
        mounted = false;
      };
    }

    const setSessionState = (hasSession: boolean, message?: string) => {
      if (!mounted) return;
      setHasRecoverySession(hasSession);
      if (message) setError(message);
      setChecking(false);
    };

    const initializeRecoverySession = async () => {
      if (initialized || !mounted) return;
      initialized = true;

      try {
        const url = new URL(window.location.href);
        const query = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const code = query.get("code");
        const tokenHash = query.get("token_hash");
        const tokenType = query.get("type");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        let authError = query.get("error_description") ?? hash.get("error_description");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          authError = exchangeError?.message ?? authError;
        } else if (tokenHash && tokenType === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          authError = verifyError?.message ?? authError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          authError = sessionError?.message ?? authError;
        }

        if (code || tokenHash || accessToken || refreshToken) cleanRecoveryUrl();

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) authError = sessionError.message;

        if (!mounted) return;
        if (sessionData.session) {
          setSessionState(true);
        } else {
          setSessionState(
            false,
            authError
              ? "تعذر التحقق من رابط الاستعادة. اطلب رابطًا جديدًا وحاول فتحه مرة واحدة فقط."
              : undefined,
          );
        }
      } catch {
        setSessionState(false, "تعذر التحقق من رابط الاستعادة. اطلب رابطًا جديدًا وحاول فتحه مرة واحدة فقط.");
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setSessionState(Boolean(session));
      }
    });

    void initializeRecoverySession();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (!supabase) {
      setError("خدمة استعادة كلمة المرور غير مهيأة حاليًا. تواصل مع مسؤول المنصة.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("تعذر تحديث كلمة المرور. قد يكون رابط الاستعادة منتهي الصلاحية، اطلب رابطًا جديدًا.");
      setSubmitting(false);
      return;
    }

    setUpdated(true);
    setSubmitting(false);
    await supabase.auth.signOut();
  };

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="card-surface p-8">
          {updated ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">تم تحديث كلمة المرور</h1>
              <p className="mt-2 text-sm text-muted-foreground">يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</p>
              <Button asChild className="mt-6 w-full">
                <Link href="/login">الانتقال إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : checking ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
              جارٍ التحقق من رابط الاستعادة…
            </div>
          ) : !hasRecoverySession ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">رابط الاستعادة غير صالح</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                انتهت صلاحية الرابط أو تم استخدامه من قبل. اطلب رابط استعادة جديدًا للمتابعة.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link href="/forgot-password">طلب رابط جديد</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">إنشاء كلمة مرور جديدة</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">اختر كلمة مرور قوية لحماية حسابك.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="6 أحرف على الأقل"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ…
                    </>
                  ) : (
                    "حفظ كلمة المرور"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
