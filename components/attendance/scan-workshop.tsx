"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scanCheckinAction } from "@/app/actions/attendance";
import { formatTime, fullName } from "@/lib/utils";
import { isLessonActive } from "@/lib/lesson-time";
import type { Group, Lesson, Student } from "@/types";
import { useClientLang } from "@/lib/i18n-client";
import { studentIdFromQrValue } from "@/lib/student-qr";
import { playQrResultSound, primeQrSound } from "@/lib/qr-sound";

export function ScanWorkshop({
  groups, lessons, students, paidThisMonth,
}: {
  groups: Group[];
  lessons: Lesson[];
  students: Student[];
  paidThisMonth: Record<string, boolean>;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [mode, setMode] = React.useState<"quick" | "manual">("quick");
  const [groupId, setGroupId] = React.useState("");
  const [lessonId, setLessonId] = React.useState("");
  const [activeLesson, setActiveLesson] = React.useState<{ id: string; topic: string } | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [log, setLog] = React.useState<{ name: string; status: string; at: string }[]>([]);
  const [error, setError] = React.useState("");
  const [lastFailedScan, setLastFailedScan] = React.useState<{ text: string; studentId: string } | null>(null);
  const lastScan = React.useRef<{ id: string; t: number }>({ id: "", t: 0 });
  const pendingScans = React.useRef(new Set<string>());
  const recentLog = React.useRef(new Map<string, number>());
  const scannerRef = React.useRef<any>(null);

  const addLog = React.useCallback((key: string, entry: { name: string; status: string; at: string }) => {
    const now = Date.now();
    const previous = recentLog.current.get(key);
    if (previous && now - previous < 5000) return;
    recentLog.current.set(key, now);
    setLog((entries) => [{ ...entry }, ...entries]);
  }, []);

  const groupLessons = lessons
    .filter((l) => l.group_id === groupId)
    .sort((a, b) => {
      const da = `${a.date} ${a.start_time ?? ""}`;
      const db = `${b.date} ${b.start_time ?? ""}`;
      return +new Date(db) - +new Date(da);
    });

  // Auto-pick today's lesson of the chosen group; else nearest upcoming; else most recent.
  const scanLessonsRef = React.useRef(groupLessons);
  React.useEffect(() => {
    // Keep the latest list reachable from effects without writing during render.
    scanLessonsRef.current = groupLessons;
  }, [groupLessons]);
  const scanKey = groupLessons.map((l) => l.id).join(",");
  React.useEffect(() => {
    if (!groupId || lessonId || !scanKey) return;
    const list = scanLessonsRef.current;
    const todayKey = new Date().toLocaleDateString("en-CA");
    const target =
      list.find((l) => isLessonActive(l)) ??
      list.find((l) => String(l.date).slice(0, 10) === todayKey) ??
      [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date)).find((l) => +new Date(`${l.date}T${l.start_time ?? "23:59"}`) >= Date.now()) ??
      list[0];
    setLessonId(target.id);
     
  }, [groupId, lessonId, scanKey]);

  const startCamera = async () => {
    setError("");
    primeQrSound();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(en ? "Scanning is unavailable offline. Reconnect to the internet and try again." : "المسح غير متاح بدون اتصال بالإنترنت. أعد الاتصال ثم حاول مرة أخرى.");
      return;
    }
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5 = new Html5Qrcode("qr-reader");
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 240, height: 240 } },
        (text) => { void handleScan(text); },
        () => {},
      );
    } catch {
      scannerRef.current = null;
      setError(en ? "Could not start the camera. Allow camera access, use HTTPS, and try again." : "تعذّر تشغيل الكاميرا. اسمح باستخدام الكاميرا وتأكد من HTTPS ثم حاول مرة أخرى.");
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); await s.clear(); } catch {}
    }
    scannerRef.current = null;
    setScanning(false);
  };

  React.useEffect(() => {
    const updateOnlineState = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        setError((current) => /offline|network|اتصال|الإنترنت|الشبكة/i.test(current) ? "" : current);
      }
    };
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  React.useEffect(() => () => { void stopCamera(); }, []);

  const handleScan = async (text: string) => {
    setError("");
    const studentId = studentIdFromQrValue(text);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLastFailedScan({ text, studentId });
      setError(en ? "Scan received, but attendance is unavailable offline. Reconnect, then retry this scan." : "تمت قراءة الكود، لكن تسجيل الحضور غير متاح بدون إنترنت. أعد الاتصال ثم أعد محاولة هذا المسح.");
      return;
    }
    const now = Date.now();
    // Keep a student on cooldown longer than the camera's repeat-detection
    // interval. The code may remain in frame after a transient response, and
    // retry rows must not accumulate until the operator deliberately rescans.
    if (lastScan.current.id === studentId && now - lastScan.current.t < 10000) {
      playQrResultSound("error");
      const duplicateMessage = en ? "Already recorded for this lesson" : "تم تسجيل الطالب لهذه الحصة من قبل";
      const duplicateStudent = students.find((s) => s.id === studentId);
      addLog(`${studentId}:duplicate`, {
        name: duplicateStudent ? fullName(duplicateStudent) : (en ? "Student" : "الطالب"),
        status: duplicateMessage,
        at: formatTime(new Date(), en ? "en-US" : "ar-EG"),
      });
      return;
    }
    lastScan.current = { id: studentId, t: now };

    // The server is authoritative for tenant scope and enrollment. Do not reject
    // a valid QR merely because the initial browser roster is stale or incomplete.
    // This is especially important after a mobile refresh or when the teacher's
    // roster snapshot was loaded before a student enrollment became visible.
    const student = students.find((s) => s.id === studentId);
    if (pendingScans.current.has(studentId)) {
      const duplicateMessage = en ? "Already being recorded" : "جارٍ تسجيل الطالب بالفعل";
      addLog(`${studentId}:pending`, { name: student ? fullName(student) : (en ? "Student" : "الطالب"), status: duplicateMessage, at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
      return;
    }
    pendingScans.current.add(studentId);

    try {
      const res = await scanCheckinAction(mode === "manual" ? lessonId : null, studentId);
      const serverStudentName = "student" in res && res.student?.name?.trim() ? res.student.name.trim() : null;
      const localStudentName = student ? fullName(student).trim() : null;
      const displayName = serverStudentName ?? localStudentName ?? (en ? "Student name unavailable" : "اسم الطالب غير متاح");
      if (res.lesson) setActiveLesson({ id: res.lesson.id, topic: res.lesson.topic });
      if (res.ok) {
        setLastFailedScan(null);
        playQrResultSound("success");
        router.refresh();
      } else playQrResultSound("error");
      const paymentStatus = paidThisMonth[studentId]
        ? (en ? "Paid this month" : "دفع الشهر")
        : (en ? "Not paid this month" : "لم يدفع الشهر");
      const status = res.ok
        ? (en ? `Attendance recorded ✓ · ${paymentStatus}${res.lesson?.topic ? ` · ${res.lesson.topic}` : ""}` : `تم تسجيل الحضور ✓ · ${paymentStatus}${res.lesson?.topic ? ` · ${res.lesson.topic}` : ""}`)
        : (en
          ? (res.errorCode === "NO_ACTIVE_LESSON" ? "No active lesson" : res.errorCode === "STUDENT_NOT_ENROLLED" ? "Student is not in this lesson" : res.errorCode === "GROUP_NOT_ASSIGNED" ? "This group is not assigned to you" : res.errorCode === "ATTENDANCE_ALREADY_RECORDED" ? "Already recorded" : res.errorCode === "TOO_MANY_SCANS" || res.errorCode === "RATE_LIMITED" ? "Too many scans — wait and retry" : res.errorCode === "TEACHER_LOGIN_REQUIRED" ? "Teacher login is required — sign in and retry" : res.errorCode === "REQUEST_FAILED" ? "Unable to process — retry the scan" : "Failed")
          : (res.errorCode === "NO_ACTIVE_LESSON" ? "لا يوجد درس جارٍ الآن" : res.errorCode === "STUDENT_NOT_ENROLLED" ? "الطالب غير مسجل في المجموعة" : res.errorCode === "GROUP_NOT_ASSIGNED" ? "هذه المجموعة غير مسندة إليك" : res.errorCode === "ATTENDANCE_ALREADY_RECORDED" ? "تم تسجيل الحضور من قبل" : res.errorCode === "TOO_MANY_SCANS" || res.errorCode === "RATE_LIMITED" ? "عدد محاولات المسح كبير — انتظر ثم أعد المحاولة" : res.errorCode === "TEACHER_LOGIN_REQUIRED" ? "يجب تسجيل دخول المدرس ثم إعادة المسح" : res.errorCode === "REQUEST_FAILED" ? "تعذر معالجة المسح — أعد المحاولة" : "فشل تسجيل الحضور"));
      addLog(`${studentId}:${res.ok ? "success" : res.errorCode}`, { name: displayName, status, at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
      if (!res.ok && (res.errorCode === "REQUEST_FAILED" || res.errorCode === "TEACHER_LOGIN_REQUIRED")) {
        setLastFailedScan({ text, studentId });
        setError(status);
      }
    } catch {
      playQrResultSound("error");
      const status = en ? "Network error — retry the scan" : "خطأ في الشبكة — أعد المسح";
      setLastFailedScan({ text, studentId });
      setError(status);
      addLog(`${studentId}:network`, { name: student ? fullName(student) : (en ? "Student" : "الطالب"), status, at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
    } finally {
      pendingScans.current.delete(studentId);
      // Keep the last detection timestamp aligned with the completed request so
      // a code held in frame cannot immediately submit a second mutation.
      lastScan.current = { id: studentId, t: Date.now() };
    }
  };

  const canScan = mode === "quick" || Boolean(groupId && lessonId);

  return (
    <div className="space-y-5" dir={en ? "ltr" : "rtl"}>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant={mode === "quick" ? "default" : "outline"} onClick={() => { setMode("quick"); setGroupId(""); setLessonId(""); }}>
              {en ? "Quick Scan (active lesson)" : "مسح سريع (الدرس الجاري)"}
            </Button>
            <Button type="button" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
              {en ? "Choose lesson manually" : "اختيار الدرس يدوياً"}
            </Button>
          </div>

          {mode === "quick" ? (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              {activeLesson ? (en ? `Active lesson: ${activeLesson.topic}` : `الدرس الجاري: ${activeLesson.topic}`) : (en ? "The system will detect the teacher's active lesson after each scan." : "النظام سيحدد درس المدرس الجاري تلقائياً بعد كل مسح.")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{en ? "1. Choose group" : "1. اختر الجروب"}</label>
                <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setLessonId(""); }} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{en ? "Choose…" : "اختر…"}</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{en ? "2. Choose lesson" : "2. اختر الدرس"}</label>
                <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!groupId} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
                  <option value="">{en ? "Choose…" : "اختر…"}</option>
                  {groupLessons.map((l) => <option key={l.id} value={l.id}>{new Date(l.date + "T00:00:00").toLocaleDateString(en ? "en-EG" : "ar-EG", { weekday: "long", day: "numeric", month: "short" })} • {l.start_time ? l.start_time.slice(0, 5) : ""}{l.topic ? ` — ${l.topic}` : ""}</option>)}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!canScan ? (
        <p className="text-center text-sm text-muted-foreground">{en ? "Choose a group and lesson to start scanning." : "اختر جروب ودرس الأول عشان تبدأ المسح."}</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              {!scanning ? (
                <Button onClick={startCamera} className="w-full">
                  <Camera className="h-4 w-4" /> {en ? "Start camera scanning" : "ابدأ المسح بالكاميرا"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div id="qr-reader" className="mx-auto overflow-hidden rounded-xl" />
                  <Button onClick={stopCamera} variant="outline" className="w-full">
                    <CameraOff className="h-4 w-4" /> {en ? "Stop camera" : "إيقاف الكاميرا"}
                  </Button>
                </div>
              )}
              {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
              {!isOnline && <p className="mt-2 text-center text-xs text-amber-700">{en ? "Offline: scanning is paused until the connection returns." : "أنت غير متصل: تم إيقاف المسح حتى عودة الاتصال."}</p>}
              {lastFailedScan && isOnline && (
                <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => { lastScan.current = { id: "", t: 0 }; void handleScan(lastFailedScan.text); }}>
                  {en ? "Retry last scan" : "إعادة محاولة آخر مسح"}
                </Button>
              )}
              <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <ScanLine className="h-3.5 w-3.5" /> {en ? "Point the camera at the student's code" : "وجّه الكاميرا لكود الطالب"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-2.5 text-sm font-semibold">{en ? "Attendance log" : "سجل الحضور"} ({log.length})</div>
              {log.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{en ? "Scan a student code to see it here…" : "امسح كود طالب ليظهر هنا…"}</p>
              ) : (
                <div className="divide-y">
                  {log.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <span className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {entry.name}</span>
                      <span className="flex items-center gap-2"><Badge variant={entry.status.includes("✓") ? "success" : "destructive"}>{entry.status}</Badge><span className="text-xs text-muted-foreground">{entry.at}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
