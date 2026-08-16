"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Clock, LogIn, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";

type QuickGroup = {
  id: string;
  name: string;
  lesson?: { id: string; topic: string; startTime: string; endTime: string };
};

type QuickState = "loading" | "student_qr" | "staff_loading" | "choose_group" | "recording" | "ok" | "err";

function CheckInInner() {
  const lang = useClientLang();
  const en = lang === "en";
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const lessonIdParam = params.get("lesson") ?? "";
  const studentId = params.get("studentId") || params.get("student") || "";
  const [state, setState] = React.useState<QuickState>("loading");
  const [msg, setMsg] = React.useState("");
  const [groups, setGroups] = React.useState<QuickGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [lessonLabel, setLessonLabel] = React.useState("");
  const autoStarted = React.useRef(false);

  const recordForGroup = React.useCallback(async (groupId?: string) => {
    setState("recording");
    setMsg("");
    try {
      const response = await fetch("/api/checkin/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, groupId: groupId || undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        const errorText = result.error === "NO_ACTIVE_LESSON"
          ? (en ? "There is no active lesson for this group right now." : "لا يوجد درس جارٍ لهذه المجموعة الآن.")
          : result.error === "STUDENT_NOT_ENROLLED"
            ? (en ? "This student is not enrolled in the selected group." : "هذا الطالب غير مسجل في المجموعة المختارة.")
            : result.error === "TEACHER_LOGIN_REQUIRED"
              ? (en ? "Log in once on this phone as a teacher or assistant, then scan again." : "سجّل الدخول مرة واحدة على هذا الهاتف كمدرس أو مساعد ثم امسح الكود مرة أخرى.")
              : (result.error || (en ? "Unable to record attendance." : "تعذّر تسجيل الحضور."));
        setState("err");
        setMsg(errorText);
        return;
      }
      setLessonLabel(`${result.lesson.groupName} — ${result.lesson.topic}`);
      setState("ok");
    } catch {
      setState("err");
      setMsg(en ? "Network error. Please try again." : "حدث خطأ في الاتصال. حاول مرة أخرى.");
    }
  }, [en, studentId]);

  React.useEffect(() => {
    if (!token && !lessonIdParam && studentId) {
      let cancelled = false;
      const loadStaffFlow = async () => {
        setState("staff_loading");
        try {
          const response = await fetch(`/api/checkin/teacher?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
          const result = await response.json();
          if (cancelled) return;
          if (response.status === 401) {
            setState("student_qr");
            return;
          }
          if (!response.ok || !result.ok) {
            setState("err");
            setMsg(en ? "Unable to load quick attendance." : "تعذّر فتح الحضور السريع.");
            return;
          }
          const availableGroups = (result.groups ?? []) as QuickGroup[];
          setGroups(availableGroups);
          const initialGroupId = result.preferredGroupId || result.activeLesson?.groupId || availableGroups[0]?.id || "";
          setSelectedGroupId(initialGroupId);
          if (result.activeLesson && !autoStarted.current) {
            autoStarted.current = true;
            setLessonLabel(`${result.activeLesson.groupName} — ${result.activeLesson.topic}`);
            void recordForGroup(result.activeLesson.groupId);
          } else {
            setState("choose_group");
          }
        } catch {
          if (!cancelled) {
            setState("err");
            setMsg(en ? "Network error. Please try again." : "حدث خطأ في الاتصال. حاول مرة أخرى.");
          }
        }
      };
      void loadStaffFlow();
      return () => { cancelled = true; };
    }

    if (!token && !lessonIdParam) {
      setState("err");
      setMsg(en ? "Invalid check-in link." : "رابط تسجيل الحضور غير صالح.");
      return;
    }

    const doStudentCheckin = async () => {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, lessonId: lessonIdParam }),
        }).then((r) => r.json());
        if (res.ok) setState("ok");
        else { setState("err"); setMsg(res.error || (en ? "Unable to record attendance." : "تعذّر تسجيل الحضور.")); }
      } catch {
        setState("err"); setMsg(en ? "Network error. Please try again." : "حدث خطأ في الاتصال. حاول مرة أخرى.");
      }
    };
    void doStudentCheckin();
  }, [en, lessonIdParam, recordForGroup, studentId, token]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        {(state === "loading" || state === "staff_loading" || state === "recording") && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {state === "recording" ? (en ? "Recording attendance…" : "جارٍ تسجيل الحضور…") : (en ? "Opening quick attendance…" : "جارٍ فتح الحضور السريع…")}
            </p>
          </>
        )}
        {state === "ok" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
            <h1 className="text-lg font-semibold">{en ? "Attendance recorded successfully" : "تم تسجيل الحضور بنجاح"}</h1>
            <p className="text-sm text-muted-foreground">{lessonLabel || (en ? "The student has been marked present." : "تم تسجيل الطالب كحاضر.")}</p>
            <p className="text-xs text-muted-foreground">{en ? "The selected group will remain active for 30 minutes." : "ستظل المجموعة المختارة مفعلة لمدة 30 دقيقة."}</p>
          </>
        )}
        {state === "student_qr" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
            <h1 className="text-lg font-semibold">{en ? "Student QR is valid" : "رمز الطالب صالح"}</h1>
            <p className="text-sm text-muted-foreground">{en ? "Log in as a teacher or assistant on this phone to record attendance directly." : "سجّل الدخول كمدرس أو مساعد على هذا الهاتف لتسجيل الحضور مباشرة."}</p>
            <Button onClick={() => { sessionStorage.setItem("myacademy_checkin_return", `${window.location.pathname}${window.location.search}`); router.push("/login"); }}><LogIn className="me-2 h-4 w-4" />{en ? "Log in" : "تسجيل الدخول"}</Button>
          </>
        )}
        {state === "choose_group" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-8 w-8" /></div>
            <h1 className="text-lg font-semibold">{en ? "Choose the attendance group" : "اختر مجموعة الحضور"}</h1>
            <p className="text-sm text-muted-foreground">{en ? "Your choice is remembered on this phone for 30 minutes." : "سيتم حفظ اختيارك على هذا الهاتف لمدة 30 دقيقة."}</p>
            <select className="w-full rounded-md border bg-background px-3 py-3 text-sm" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.lesson ? ` — ${group.lesson.topic}` : ""}</option>)}
            </select>
            <Button className="w-full" disabled={!selectedGroupId} onClick={() => void recordForGroup(selectedGroupId)}>{en ? "Record attendance" : "تسجيل الحضور"}</Button>
          </>
        )}
        {state === "err" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600"><XCircle className="h-8 w-8" /></div>
            <h1 className="text-lg font-semibold">{en ? "Unable to record attendance" : "تعذّر تسجيل الحضور"}</h1>
            <p className="text-sm text-muted-foreground">{msg}</p>
            {msg.toLowerCase().includes("expired") && <p className="flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3 w-3" />{en ? "Ask for a new QR code." : "اطلب رمز QR جديداً."}</p>}
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
        <React.Suspense fallback={<Card><CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> {en ? "Loading…" : "جارٍ التحميل…"}</CardContent></Card>}>
          <CheckInInner />
        </React.Suspense>
      </div>
    </div>
  );
}
