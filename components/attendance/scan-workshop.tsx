"use client";

import * as React from "react";
import { Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { scanCheckinAction } from "@/app/actions/attendance";
import { fullName } from "@/lib/utils";
import type { Group, Lesson, Student } from "@/types";

export function ScanWorkshop({
  groups, lessons, students,
}: {
  groups: Group[];
  lessons: Lesson[];
  students: Student[];
}) {
  const [groupId, setGroupId] = React.useState("");
  const [lessonId, setLessonId] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [log, setLog] = React.useState<{ name: string; status: string; at: string }[]>([]);
  const [error, setError] = React.useState("");
  const lastScan = React.useRef<{ id: string; t: number }>({ id: "", t: 0 });
  const scannerRef = React.useRef<any>(null);

  const groupLessons = lessons
    .filter((l) => l.group_id === groupId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const startCamera = async () => {
    setError("");
    setScanning(true);
    // dynamically import to keep it client-only
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 100)); // let DOM mount
    const html5 = new Html5Qrcode("qr-reader");
    scannerRef.current = html5;
    html5
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => handleScan(text),
        () => {},
      )
      .catch((e) => {
        setError("تعذّر تشغيل الكاميرا. تأكّد من الإذن ومن أنك على HTTPS.");
        setScanning(false);
      });
  };

  const stopCamera = async () => {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); await s.clear(); } catch {}
    }
    scannerRef.current = null;
    setScanning(false);
  };
  React.useEffect(() => () => { stopCamera(); }, []);

  const handleScan = async (text: string) => {
    setError("");
    const studentId = text.startsWith("MA:") ? text.slice(3) : text;
    // debounce duplicates within 4s
    const now = Date.now();
    if (lastScan.current.id === studentId && now - lastScan.current.t < 4000) return;
    lastScan.current = { id: studentId, t: now };

    const student = students.find((s) => s.id === studentId);
    if (!student) {
      setLog((l) => [{ name: "كود غير معروف", status: "غير معروف", at: new Date().toLocaleTimeString() }, ...l]);
      return;
    }
    const res = await scanCheckinAction(lessonId, studentId);
    setLog((l) => [
      { name: fullName(student), status: res?.ok ? "تم تسجيل الحضور ✓" : "فشل", at: new Date().toLocaleTimeString() },
      ...l,
    ]);
  };

  return (
    <div className="space-y-5">
      {/* Setup */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">1. اختر الجروب</label>
            <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setLessonId(""); }} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">اختر…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">2. اختر الدرس</label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!groupId} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
              <option value="">اختر…</option>
              {groupLessons.map((l) => <option key={l.id} value={l.id}>{l.topic} — {new Date(l.date).toLocaleDateString()}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {!groupId || !lessonId ? (
        <p className="text-center text-sm text-muted-foreground">اختر جروب ودرس الأول عشان تبدأ المسح.</p>
      ) : (
        <>
          {/* Scanner */}
          <Card>
            <CardContent className="p-4">
              {!scanning ? (
                <Button onClick={startCamera} className="w-full">
                  <Camera className="h-4 w-4" /> ابدأ المسح بالكاميرا
                </Button>
              ) : (
                <div className="space-y-3">
                  <div id="qr-reader" className="mx-auto overflow-hidden rounded-xl" />
                  <Button onClick={stopCamera} variant="outline" className="w-full">
                    <CameraOff className="h-4 w-4" /> إيقاف الكاميرا
                  </Button>
                </div>
              )}
              {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
              <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <ScanLine className="h-3.5 w-3.5" /> وجّه الكاميرا لكود الطالب
              </p>
            </CardContent>
          </Card>

          {/* Log */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-2.5 text-sm font-semibold">سجل الحضور ({log.length})</div>
              {log.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">امسح كود طالب ليظهر هنا…</p>
              ) : (
                <div className="divide-y">
                  {log.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {entry.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant={entry.status.includes("✓") ? "success" : "destructive"}>{entry.status}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.at}</span>
                      </span>
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
