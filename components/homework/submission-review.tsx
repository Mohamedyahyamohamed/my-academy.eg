"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HomeworkBadge } from "@/components/shared/badges";
import { reviewSubmissionAction } from "@/app/actions/homework";
import { formatRelative } from "@/lib/utils";
import type { HomeworkSubmission } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function SubmissionReview({ submissions }: { submissions: HomeworkSubmission[] }) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const start = (s: HomeworkSubmission) => {
    setOpenId(s.id);
    setFeedback(s.feedback ?? "");
    setGrade(s.grade != null ? String(s.grade) : "");
  };

  const save = async (id: string) => {
    setSaving(true);
    try {
      await reviewSubmissionAction(id, feedback, grade ? Number(grade) : undefined);
      toast.success(en ? "Submission reviewed." : "تمت مراجعة التسليم.");
      setOpenId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (submissions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No students in this group yet." : "لا يوجد طلاب في هذه المجموعة بعد."}</p>;
  }

  return (
    <div className="space-y-3" dir={en ? "ltr" : "rtl"}>
      {submissions.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.student ? `${s.student.first_name} ${s.student.last_name}` : "—"}</p>
                {s.content ? (
                  <p className="mt-1 rounded-md bg-muted p-2 text-sm">{s.content}</p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{en ? "No submission yet." : "لا يوجد تسليم بعد."}</p>
                )}
                {s.feedback && openId !== s.id && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">{en ? "Teacher feedback:" : "ملاحظات المعلّم:"}</span> {s.feedback}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <HomeworkBadge status={s.status} />
                {s.grade != null && <Badge variant="info">{s.grade}/10</Badge>}
                {s.submitted_at && (
                  <span className="text-[11px] text-muted-foreground">{formatRelative(s.submitted_at, en ? "en-EG" : "ar-EG")}</span>
                )}
              </div>
            </div>
            {s.status === "SUBMITTED" || openId === s.id ? (
              openId === s.id ? (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label>{en ? "Teacher feedback" : "ملاحظات المعلّم"}</Label>
                    <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder={en ? "Write feedback for the student…" : "اكتب ملاحظاتك للطالب…"} />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="w-32 space-y-1.5">
                      <Label>{en ? "Grade /10" : "الدرجة /10"}</Label>
                      <Input type="number" min={0} max={10} value={grade} onChange={(e) => setGrade(e.target.value)} />
                    </div>
                    <Button onClick={() => save(s.id)} disabled={saving} className="ml-auto">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Save review" : "حفظ المراجعة"}
                    </Button>
                    <Button variant="ghost" onClick={() => setOpenId(null)}>{en ? "Cancel" : "إلغاء"}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="soft" size="sm" className="mt-3" onClick={() => start(s)}>
                  <MessageSquare className="h-3.5 w-3.5" /> {en ? "Review" : "مراجعة"}
                </Button>
              )
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
