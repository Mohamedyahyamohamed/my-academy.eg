"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { useClientLang } from "@/lib/i18n-client";

function CheckInInner() {
  const lang = useClientLang();
  const en = lang === "en";
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const lessonIdParam = params.get("lesson") ?? "";
  const studentQrParam = params.get("student") ?? "";
  const [state, setState] = React.useState<"loading" | "ok" | "student_qr" | "err">("loading");
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    const doCheckin = async () => {
      // A personal student QR is intentionally a profile/identity QR, not a
      // self-check-in session token. It is consumed by the teacher scanner.
      if (!token && !lessonIdParam && studentQrParam) {
        setState("student_qr");
        return;
      }
      if (!token && !lessonIdParam) {
        setState("err"); setMsg(en ? "Invalid check-in link." : "رابط تسجيل الحضور غير صالح."); return;
      }
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, lessonId: lessonIdParam }),
        }).then((r) => r.json());
        if (res.ok) { setState("ok"); }
        else { setState("err"); setMsg(res.error || (en ? "Unable to record attendance." : "تعذّر تسجيل الحضور.")); }
      } catch {
        setState("err"); setMsg(en ? "Network error. Please try again." : "حدث خطأ في الاتصال. حاول مرة أخرى.");
      }
    };
    doCheckin();
  }, [token, lessonIdParam, studentQrParam, en]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{en ? "Recording your attendance…" : "جارٍ تسجيل حضورك…"}</p>
          </>
        )}
        {state === "ok" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-lg font-semibold">{en ? "Attendance recorded successfully" : "تم تسجيل حضورك بنجاح"}</h1>
            <p className="text-sm text-muted-foreground">{en ? "You have been marked present." : "تم تسجيل حضورك كحاضر."}</p>
          </>
        )}
        {state === "student_qr" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-lg font-semibold">{en ? "Student QR is valid" : "رمز الطالب صالح"}</h1>
            <p className="text-sm text-muted-foreground">{en ? "Show this QR code to your teacher to record attendance." : "اعرض رمز QR للمدرس لتسجيل الحضور."}</p>
          </>
        )}
        {state === "err" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="text-lg font-semibold">{en ? "Unable to record attendance" : "تعذّر تسجيل الحضور"}</h1>
            <p className="text-sm text-muted-foreground">{msg}</p>
            {(msg.includes("expired") || msg.includes("منتهي")) && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" /> {en ? "Ask your teacher to create a new QR code." : "اطلب من مدرّسك إنشاء رمز QR جديد."}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CheckInPage() {
  const en = useClientLang() === "en";
  return (
    <div dir={en ? "ltr" : "rtl"} className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center"><Logo /></div>
        <React.Suspense
          fallback={
            <Card>
              <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> {en ? "Loading…" : "جارٍ التحميل…"}
              </CardContent>
            </Card>
          }
        >
          <CheckInInner />
        </React.Suspense>
      </div>
    </div>
  );
}
