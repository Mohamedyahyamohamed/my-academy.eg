"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { saveGradesAction } from "@/app/actions/grades";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";
import { fullName, round } from "@/lib/utils";
import { useClientLang } from "@/lib/i18n-client";

interface GradeEntryProps {
  examId: string;
  maxScore: number;
  roster: { studentId: string; name: string; score: number | null; notes?: string | null }[];
}

export function GradeEntry({ examId, maxScore, roster }: GradeEntryProps) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [scores, setScores] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const init: Record<string, string> = {};
    const noteInit: Record<string, string> = {};
    roster.forEach((r) => {
      init[r.studentId] = r.score != null ? String(r.score) : "";
      noteInit[r.studentId] = r.notes ?? "";
    });
    setScores(init);
    setNotes(noteInit);
  }, [roster]);

  const avg = React.useMemo(() => {
    const vals = Object.values(scores)
      .map((v) => Number(v))
      .filter((v) => v !== 0 && !Number.isNaN(v));
    if (!vals.length) return 0;
    return round((vals.reduce((s, v) => s + v, 0) / vals.length / maxScore) * 100, 0);
  }, [scores, maxScore]);

  const save = async () => {
    const entries: { studentId: string; score: number; notes?: string | null }[] = [];
    for (const r of roster) {
      const raw = scores[r.studentId];
      if (raw === "" || raw == null) continue;
      const n = Number(raw);
      if (Number.isNaN(n)) {
        toast.error(en ? `Invalid score for ${r.name}.` : `درجة غير صالحة للطالب ${r.name}.`);
        return;
      }
      if (n < 0) { toast.error(en ? "Scores cannot be negative." : "لا يمكن أن تكون الدرجات سالبة."); return; }
      if (n > maxScore) { toast.error(en ? `${r.name}'s score exceeds the maximum (${maxScore}).` : `تتجاوز درجة ${r.name} الحد الأقصى (${maxScore}).`); return; }
      entries.push({ studentId: r.studentId, score: n, notes: notes[r.studentId]?.trim() || null });
    }
    setSaving(true);
    try {
      const res = await saveGradesAction(examId, entries);
      if (!res.ok) { toast.error(res.error ?? (en ? "Could not save grades." : "تعذّر حفظ الدرجات.")); return; }
      toast.success(en ? `Grades saved for ${entries.length} student(s).` : `تم حفظ درجات ${entries.length} طالب.`);
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={en ? "ltr" : "rtl"}>
      <div className="mb-4 flex items-center gap-3" dir={en ? "ltr" : "rtl"}>
        <Badge variant="secondary">{en ? "Group average" : "متوسط المجموعة"}</Badge>
        <span className="nums text-lg font-semibold">{avg}%</span>
        <Badge className={performanceColor(performanceLevel(avg))}>{performanceLabel(performanceLevel(avg))}</Badge>
        <Button onClick={save} disabled={saving} variant="premium" className="ml-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {en ? "Save grades" : "حفظ الدرجات"}
        </Button>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {roster.map((r) => {
            const val = scores[r.studentId];
            const n = Number(val);
            const pct = val !== "" && !Number.isNaN(n) ? round((n / maxScore) * 100, 0) : null;
            const level = pct != null ? performanceLevel(pct) : null;
            return (
              <div key={r.studentId} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <StudentAvatar name={r.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    {level && <Badge className={`mt-0.5 ${performanceColor(level)}`}>{performanceLabel(level)} · {pct}%</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxScore}
                    step="any"
                    value={val}
                    onChange={(e) => setScores((cur) => ({ ...cur, [r.studentId]: e.target.value }))}
                    className="nums w-24 text-right"
                    placeholder="—"
                  />
                  <span className="nums w-16 text-sm text-muted-foreground">/ {maxScore}</span>
                  <Input
                    value={notes[r.studentId] ?? ""}
                    onChange={(e) => setNotes((cur) => ({ ...cur, [r.studentId]: e.target.value }))}
                    className="w-44"
                    maxLength={500}
                    placeholder={en ? "Note (optional)" : "ملاحظة اختيارية"}
                    aria-label={en ? `Note for ${r.name}` : `ملاحظة ${r.name}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
