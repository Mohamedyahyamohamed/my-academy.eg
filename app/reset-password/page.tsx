"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecoverySupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { useClientLang } from "@/lib/i18n-client";

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
  const en = useClientLang() === "en";
  const supabase = React.useMemo(
    () => (isSupabaseConfigured() ? createRecoverySupabaseClient() : null),
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
              ? (en ? "Unable to verify the recovery link. Request a new link and open it only once." : "تعذر التحقق من رابط الاستعادة. اطلب رابطًا جديدًا وحاول فتحه مرة واحدة فقط.")
              : undefined,
          );
        }
      } catch {
        setSessionState(false, en ? "Unable to verify the recovery link. Request a new link and open it only once." : "تعذر التحقق من رابط الاستعادة. اطلب رابطًا جديدًا وحاول فتحه مرة واحدة فقط.");
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
  }, [en, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(en ? "The new password must be at least 6 characters." : "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError(en ? "The passwords do not match." : "كلمتا المرور غير متطابقتين.");
      return;
    }

    if (!supabase) {
      setError(en ? "Password recovery is not configured. Contact the platform administrator." : "خدمة استعادة كلمة المرور غير مهيأة حاليًا. تواصل مع مسؤول المنصة.");
      return;
    }

    setSubmitting(true);

    try {
      // On mobile browsers the recovery session can be persisted a moment
      // after the URL token is exchanged. Read it again, then refresh it when
      // necessary, before calling updateUser.
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!sessionData.session && !sessionError) {
        const refreshed = await supabase.auth.refreshSession();
        sessionData = refreshed.data;
        sessionError = refreshed.error;
      }

      if (sessionError || !sessionData.session) {
        setError(en ? "The recovery session expired. Request a new link and open it only once." : "انتهت جلسة الاستعادة. اطلب رابطًا جديدًا وافتحه مرة واحدة فقط.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        // Supabase may return a generic HTTP 422 for leaked/common passwords;
        // never expose the provider's raw message, but guide the user to a
        // password that satisfies the project's security policy.
        const message = updateError.message.toLowerCase();
        const code = String((updateError as { code?: string }).code ?? "").toLowerCase();
        const isCompromisedPassword = ["breach", "compromised", "leaked", "pwned", "common", "weak_password"].some(
          (term) => message.includes(term) || code.includes(term),
        );
        if (isCompromisedPassword || (message.includes("password") && (message.includes("weak") || message.includes("least") || message.includes("characters")))) {
          setError(en ? "This password is too common or has appeared in a data breach. Use a unique, longer password with mixed characters." : "كلمة المرور شائعة أو ظهرت في تسريب بيانات. استخدم كلمة مرور أطول وفريدة ومتنوعة الأحرف.");
        } else if (message.includes("session") || message.includes("reauthor") || message.includes("expired")) {
          setError(en ? "The recovery session expired. Request a new link and open it only once." : "انتهت جلسة الاستعادة. اطلب رابطًا جديدًا وافتحه مرة واحدة فقط.");
        } else {
          setError(en ? "Unable to update the password. Try again with a new recovery link." : "تعذر تحديث كلمة المرور حاليًا. حاول باستخدام رابط استعادة جديد.");
        }
        return;
      }

      setUpdated(true);
      await supabase.auth.signOut();
    } catch {
      setError(en ? "An unexpected error occurred while saving the password. Request a new recovery link and try again." : "حدث خطأ غير متوقع أثناء حفظ كلمة المرور. اطلب رابط استعادة جديدًا وحاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={en ? "ltr" : "rtl"} className="flex min-h-screen items-center justify-center px-6 py-12">
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
              <h1 className="text-xl font-semibold tracking-tight">{en ? "Password updated" : "تم تحديث كلمة المرور"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{en ? "You can now sign in with your new password." : "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة."}</p>
              <Button asChild className="mt-6 w-full">
                <Link href="/login">{en ? "Go to sign in" : "الانتقال إلى تسجيل الدخول"}</Link>
              </Button>
            </div>
          ) : checking ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
              {en ? "Verifying recovery link…" : "جارٍ التحقق من رابط الاستعادة…"}
            </div>
          ) : !hasRecoverySession ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">{en ? "Invalid recovery link" : "رابط الاستعادة غير صالح"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {en ? "The link has expired or was already used. Request a new recovery link to continue." : "انتهت صلاحية الرابط أو تم استخدامه من قبل. اطلب رابط استعادة جديدًا للمتابعة."}
              </p>
              <Button asChild className="mt-6 w-full">
                <Link href="/forgot-password">{en ? "Request a new link" : "طلب رابط جديد"}</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">{en ? "Create a new password" : "إنشاء كلمة مرور جديدة"}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{en ? "Choose a strong password to protect your account." : "اختر كلمة مرور قوية لحماية حسابك."}</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{en ? "New password" : "كلمة المرور الجديدة"}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onPaste={(event) => {
                      const pastedValue = event.clipboardData.getData("text");
                      if (pastedValue) {
                        event.preventDefault();
                        setPassword(pastedValue);
                      }
                    }}
                    placeholder={en ? "At least 6 characters" : "6 أحرف على الأقل"}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">{en ? "Confirm password" : "تأكيد كلمة المرور"}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onPaste={(event) => {
                      const pastedValue = event.clipboardData.getData("text");
                      if (pastedValue) {
                        event.preventDefault();
                        setConfirmPassword(pastedValue);
                      }
                    }}
                    placeholder={en ? "Re-enter your password" : "أعد كتابة كلمة المرور"}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {en ? "Saving…" : "جارٍ الحفظ…"}
                    </>
                  ) : (
                    en ? "Save password" : "حفظ كلمة المرور"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {en ? "Back to sign in" : "العودة لتسجيل الدخول"}
          </Link>
        </div>
      </div>
    </div>
  );
}
