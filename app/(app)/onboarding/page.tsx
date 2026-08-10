"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Building2, BookOpen, Users, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, title: "Academy Info", icon: Building2 },
  { id: 1, title: "First Course", icon: BookOpen },
  { id: 2, title: "First Group", icon: Users },
  { id: 3, title: "Done", icon: Rocket },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [academy, setAcademy] = React.useState({ name: "", phone: "", address: "" });
  const [course, setCourse] = React.useState({ name: "", color: "#7c5cfc" });
  const [group, setGroup] = React.useState({ name: "", fee: "", schedule: "" });

  const complete = async () => {
    setLoading(true);
    try {
      if (academy.name) {
        const { updateAcademyAction } = await import("@/app/actions/settings");
        await updateAcademyAction(academy);
      }
      if (course.name) {
        const { createCourseAction } = await import("@/app/actions/settings");
        const { createGroupAction } = await import("@/app/actions/groups");
        const c: any = await createCourseAction({ name: course.name, color: course.color });
        if (group.name) {
          await createGroupAction({ name: group.name, course_id: c?.id ?? "", teacher_id: "", monthly_fee: Number(group.fee) || 0, schedule: group.schedule });
        }
      }
      toast.success("Onboarding complete!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. You can finish later.");
      router.push("/dashboard");
    } finally { setLoading(false); }
  };

  const next = () => { if (step < 3) setStep(step + 1); else complete(); };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to MY Academy! 🎉</h1>
        <p className="mt-1 text-sm text-muted-foreground">Let&apos;s set up your academy in a few quick steps.</p>
      </div>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <s.icon className="h-3.5 w-3.5" /> {s.title}
            </div>
            {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />}
          </React.Fragment>
        ))}
      </div>
      <Card><CardContent className="space-y-4 p-6">
        {step === 0 && (
          <>
            <h2 className="font-semibold">Academy Information</h2>
            <div className="space-y-1.5"><Label>Academy name</Label><Input value={academy.name} onChange={(e) => setAcademy(a => ({ ...a, name: e.target.value }))} placeholder="MY Academy" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={academy.phone} onChange={(e) => setAcademy(a => ({ ...a, phone: e.target.value }))} placeholder="+20 ..." /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={academy.address} onChange={(e) => setAcademy(a => ({ ...a, address: e.target.value }))} placeholder="City, Country" /></div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="font-semibold">Create Your First Course</h2>
            <div className="space-y-1.5"><Label>Course name</Label><Input value={course.name} onChange={(e) => setCourse(c => ({ ...c, name: e.target.value }))} placeholder="Mathematics" /></div>
            <div className="flex flex-wrap gap-2 pt-1">
              {["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"].map(col => (
                <button key={col} type="button" onClick={() => setCourse(c => ({ ...c, color: col }))} className={cn("h-7 w-7 rounded-full border-2", course.color === col ? "border-foreground" : "border-transparent")} style={{ background: col }} />
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="font-semibold">Create Your First Group</h2>
            <div className="space-y-1.5"><Label>Group name</Label><Input value={group.name} onChange={(e) => setGroup(g => ({ ...g, name: e.target.value }))} placeholder="Grade 9 — Math A" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Monthly fee</Label><Input type="number" value={group.fee} onChange={(e) => setGroup(g => ({ ...g, fee: e.target.value }))} placeholder="1200" /></div>
              <div className="space-y-1.5"><Label>Schedule</Label><Input value={group.schedule} onChange={(e) => setGroup(g => ({ ...g, schedule: e.target.value }))} placeholder="Sun, Tue — 4PM" /></div>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="text-lg font-semibold">You&apos;re all set! 🚀</h2>
            <p className="text-sm text-muted-foreground">Your academy is ready. Add students, take attendance, and start teaching.</p>
          </div>
        )}
      </CardContent></Card>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : router.push("/dashboard")}>{step > 0 ? "Back" : "Skip"}</Button>
        <Button onClick={next} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} {step === 3 ? "Go to Dashboard" : "Next"}</Button>
      </div>
    </div>
  );
}
