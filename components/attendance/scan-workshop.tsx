"use client";

import * as React from "react";
import { Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scanCheckinAction } from "@/app/actions/attendance";
import { formatTime, fullName } from "@/lib/utils";
import type { Group, Lesson, Student } from "@/types";
import { useClientLang } from "@/lib/i18n-client";
import { studentIdFromQrValue } from "@/lib/student-qr";

export function ScanWorkshop({
  groups, lessons, students,
}: {
  groups: Group[];
  lessons: Lesson[];
  students: Student[];
}) {
  const en = useClientLang() === "en";
  const [mode, setMode] = React.useState<"quick" | "manual">("quick");
  const [groupId, setGroupId] = React.useState("");
  const [lessonId, setLessonId] = React.useState("");
  const [activeLesson, setActiveLesson] = React.useState<{ id: string; topic: string } | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [log, setLog] = React.useState<{ name: string; status: string; at: string }[]>([]);
  const [error, setError] = React.useState("");
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
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const startCamera = async () => {
    setError("");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(en ? "Scanning is unavailable offline. Reconnect to the internet and try again." : "المسح غير متاح بدون اتصال بالإنترنت. أعد الاتصال ثم حاول مرة أخرى.");
      return;
    }
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await new Promise((r) => setTimeout(r, 100));
      const html5 = new Html5Qrcode("qr-reader");
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
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

  React.useEffect(() => () => { void stopCamera(); }, []);

  const handleScan = async (text: string) => {
    setError("");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(en ? "Scan received, but attendance is unavailable offline. Reconnect and scan again." : "تمت قراءة الكود، لكن تسجيل الحضور غير متاح بدون إنترنت. أعد الاتصال وامسح الكود مرة أخرى.");
      return;
    }
    const studentId = studentIdFromQrValue(text);
    const now = Date.now();
    if (lastScan.current.id === studentId && now - lastScan.current.t < 4000) return;
    lastScan.current = { id: studentId, t: now };

    const student = students.find((s) => s.id === studentId);
    if (!student) {
      addLog(`unknown:${studentId}`, { name: en ? "Unknown code" : "كود غير معروف", status: en ? "Unknown" : "غير معروف", at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
      return;
    }
    if (pendingScans.current.has(studentId)) return;
    pendingScans.current.add(studentId);

    try {
      const res = await scanCheckinAction(mode === "manual" ? lessonId : null, studentId);
      if (res.lesson) setActiveLesson({ id: res.lesson.id, topic: res.lesson.topic });
      const status = res.ok
        ? (en ? `Attendance recorded ✓${res.lesson?.topic ? ` · ${res.lesson.topic}` : ""}` : `تم تسجيل الحضور ✓${res.lesson?.topic ? ` · ${res.lesson.topic}` : ""}`)
        : (en
          ? (res.errorCode === "NO_ACTIVE_LESSON" ? "No active lesson" : res.errorCode === "STUDENT_NOT_ENROLLED" ? "Student is not in this lesson" : res.errorCode === "ATTENDANCE_ALREADY_RECORDED" ? "Already recorded" : res.errorCode === "REQUEST_FAILED" ? "Unable to process — retry the scan" : "Failed")
          : (res.errorCode === "NO_ACTIVE_LESSON" ? "لا يوجد درس جارٍ الآن" : res.errorCode === "STUDENT_NOT_ENROLLED" ? "الطالب غير مسجل في المجموعة" : res.errorCode === "ATTENDANCE_ALREADY_RECORDED" ? "تم تسجيل الحضور من قبل" : res.errorCode === "REQUEST_FAILED" ? "تعذر معالجة المسح — أعد المحاولة" : "فشل تسجيل الحضور"));
      addLog(`${studentId}:${res.ok ? "success" : res.errorCode}`, { name: fullName(student), status, at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
      if (!res.ok && res.errorCode === "REQUEST_FAILED") setError(status);
    } catch {
      const status = en ? "Network error — retry the scan" : "خطأ في الشبكة — أعد المسح";
      setError(status);
      addLog(`${studentId}:network`, { name: fullName(student), status, at: formatTime(new Date(), en ? "en-US" : "ar-EG") });
    } finally {
      pendingScans.current.delete(studentId);
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
                  {groupLessons.map((l) => <option key={l.id} value={l.id}>{l.topic} — {new Date(l.date).toLocaleDateString(en ? "en-EG" : "ar-EG")}</option>)}
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
