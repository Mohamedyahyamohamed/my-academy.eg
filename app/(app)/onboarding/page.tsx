"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Building2, BookOpen, Users, Rocket, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, title: "بيانات الأكاديمية", icon: Building2 },
  { id: 1, title: "أول مادة", icon: BookOpen },
  { id: 2, title: "أول مجموعة", icon: Users },
  { id: 3, title: "جاهزة للبدء", icon: Rocket },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [academy, setAcademy] = React.useState({ name: "", phone: "", address: "" });
  const [course, setCourse] = React.useState({ name: "", color: "#7c5cfc" });
  const [teacherInvite, setTeacherInvite] = React.useState({ fullName: "", email: "" });
  const [sendingInvite, setSendingInvite] = React.useState(false);
  const [inviteSent, setInviteSent] = React.useState(false);

  const complete = async () => {
    setLoading(true);
    try {
      if (academy.name) {
        const { updateAcademyAction } = await import("@/app/actions/settings");
        await updateAcademyAction(academy);
      }
      if (course.name) {
        const { createCourseAction } = await import("@/app/actions/settings");
        const c: any = await createCourseAction({ name: course.name, color: course.color });
        if (!c?.id) throw new Error("تعذّر إنشاء المادة الأولى.");
      }
      const { completeOnboardingAction } = await import("@/app/actions/settings");
      await completeOnboardingAction({
        hasAcademy: Boolean(academy.name),
        hasCourse: Boolean(course.name),
        hasGroup: false,
      });
      toast.success("تم تجهيز الأكاديمية بنجاح");
      router.push("/dashboard");
    } catch {
      toast.error("حدثت مشكلة. يمكنك إكمال الإعداد لاحقًا من الإعدادات.");
      router.push("/dashboard");
    } finally { setLoading(false); }
  };

  const sendTeacherInvite = async () => {
    if (!teacherInvite.email.trim()) {
      toast.error("أدخل بريد المدرس الإلكتروني أولًا.");
      return;
    }
    setSendingInvite(true);
    try {
      const { createAcademyInviteAction } = await import("@/app/actions/invites");
      const result = await createAcademyInviteAction({
        email: teacherInvite.email,
        fullName: teacherInvite.fullName,
        role: "TEACHER",
      });
      if (!result.ok) {
        toast.error(result.error || "تعذر إرسال دعوة المدرس.");
        return;
      }
      setInviteSent(true);
      toast.success(result.emailSent ? "تم إرسال دعوة المدرس بالبريد." : "تم إنشاء الدعوة. يمكنك مشاركتها من الإعدادات.");
    } catch {
      toast.error("تعذر إنشاء الدعوة الآن. يمكنك إرسالها من الإعدادات لاحقًا.");
    } finally {
      setSendingInvite(false);
    }
  };

  const next = () => { if (step < 3) setStep(step + 1); else complete(); };

  return (
    <div dir="rtl" className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">أهلًا بك في MY Academy</h1>
        <p className="mt-1 text-sm text-muted-foreground">جهّز أكاديميتك خلال دقائق ثم أضف طلابك وابدأ العمل.</p>
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
            <h2 className="font-semibold">بيانات الأكاديمية</h2>
            <div className="space-y-1.5"><Label>اسم الأكاديمية</Label><Input value={academy.name} onChange={(e) => setAcademy(a => ({ ...a, name: e.target.value }))} placeholder="أكاديمية التميز" /></div>
            <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input dir="ltr" value={academy.phone} onChange={(e) => setAcademy(a => ({ ...a, phone: e.target.value }))} placeholder="+20 10 0000 0000" /></div>
            <div className="space-y-1.5"><Label>العنوان</Label><Input value={academy.address} onChange={(e) => setAcademy(a => ({ ...a, address: e.target.value }))} placeholder="المدينة، المحافظة" /></div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="font-semibold">أنشئ أول مادة</h2>
            <div className="space-y-1.5"><Label>اسم المادة</Label><Input value={course.name} onChange={(e) => setCourse(c => ({ ...c, name: e.target.value }))} placeholder="الرياضيات" /></div>
            <div className="flex flex-wrap gap-2 pt-1">
              {["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"].map(col => (
                <button key={col} type="button" onClick={() => setCourse(c => ({ ...c, color: col }))} className={cn("h-7 w-7 rounded-full border-2", course.color === col ? "border-foreground" : "border-transparent")} style={{ background: col }} />
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="font-semibold">جهّز أول مجموعة</h2>
            <p className="text-sm leading-6 text-muted-foreground">تتطلب كل مجموعة مدرسًا معيّنًا للحفاظ على حضور الطلاب وحصصهم وصلاحياتهم بدقة. بعد إرسال دعوة المدرس وقبوله لها، أنشئ المجموعة من صفحة المجموعات وحدد المادة والمدرس والموعد.</p>
          </>
        )}
        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="text-lg font-semibold">أكاديميتك جاهزة!</h2>
            <p className="text-sm text-muted-foreground">تم إعداد الأساسيات. بعد قبول المدرس للدعوة، أنشئ مجموعتك من صفحة المجموعات وحدد المادة والمدرس والموعد.</p>
            <div className="grid w-full gap-3 pt-2 text-right sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium"><Upload className="h-4 w-4 text-primary" /> استيراد الطلاب</div>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">ارفع ملف CSV أو الصق البيانات لإضافة الطلاب وأولياء الأمور دفعة واحدة.</p>
                <Button variant="outline" size="sm" asChild><Link href="/students/import">فتح استيراد الطلاب</Link></Button>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-primary" /> دعوة أول مدرس</div>
                {inviteSent ? (
                  <p className="text-xs leading-5 text-emerald-700">تم إنشاء الدعوة بنجاح. سيظهر المدرس في الأكاديمية بعد قبولها.</p>
                ) : (
                  <div className="space-y-2">
                    <Input value={teacherInvite.fullName} onChange={(e) => setTeacherInvite(v => ({ ...v, fullName: e.target.value }))} placeholder="اسم المدرس (اختياري)" />
                    <Input dir="ltr" type="email" value={teacherInvite.email} onChange={(e) => setTeacherInvite(v => ({ ...v, email: e.target.value }))} placeholder="teacher@example.com" />
                    <Button variant="outline" size="sm" onClick={sendTeacherInvite} disabled={sendingInvite}>{sendingInvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />} إرسال الدعوة</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent></Card>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : router.push("/dashboard")}>{step > 0 ? "السابق" : "تخطّي الآن"}</Button>
        <Button onClick={next} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} {step === 3 ? "الذهاب إلى لوحة التحكم" : "التالي"}</Button>
      </div>
    </div>
  );
}
