"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Building2, BookOpen, Users, Rocket, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Lang = "ar" | "en";

export default function OnboardingPage() {
  const router = useRouter();
  const [lang, setLang] = React.useState<Lang>("ar");
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [academy, setAcademy] = React.useState({ name: "", phone: "", address: "" });
  const [course, setCourse] = React.useState({ name: "", color: "#7c5cfc" });
  const [teacherInvite, setTeacherInvite] = React.useState({ fullName: "", email: "" });
  const [sendingInvite, setSendingInvite] = React.useState(false);
  const [inviteSent, setInviteSent] = React.useState(false);
  const en = lang === "en";
  const steps = en ? ["Academy details", "First subject", "First teacher", "Ready to start"] : ["بيانات الأكاديمية", "أول مادة", "أول مجموعة", "جاهزة للبدء"];

  React.useEffect(() => {
    const stored = document.cookie.match(/(?:^|; )ma_lang=(en|ar)/)?.[1] as Lang | undefined;
    if (stored) setLang(stored);
  }, []);

  const complete = async (destination = "/dashboard") => {
    setLoading(true);
    try {
      if (academy.name) {
        const { updateAcademyAction } = await import("@/app/actions/settings");
        await updateAcademyAction(academy);
      }
      if (course.name) {
        const { createCourseAction } = await import("@/app/actions/settings");
        const c: any = await createCourseAction({ name: course.name, color: course.color });
        if (!c?.id) throw new Error(en ? "Unable to create the first subject." : "تعذّر إنشاء المادة الأولى.");
      }
      const { completeOnboardingAction } = await import("@/app/actions/settings");
      await completeOnboardingAction({ hasAcademy: Boolean(academy.name), hasCourse: Boolean(course.name), hasGroup: false });
      toast.success(en ? "Your academy is ready." : "تم تجهيز الأكاديمية بنجاح");
      router.push(destination);
    } catch {
      toast.error(en ? "Something went wrong. You can finish setup later from Settings." : "حدثت مشكلة. يمكنك إكمال الإعداد لاحقًا من الإعدادات.");
      router.push("/dashboard");
    } finally { setLoading(false); }
  };

  const sendTeacherInvite = async () => {
    if (!teacherInvite.email.trim()) {
      toast.error(en ? "Enter the teacher's email first." : "أدخل بريد المدرس الإلكتروني أولًا.");
      return;
    }
    setSendingInvite(true);
    try {
      const { createAcademyInviteAction } = await import("@/app/actions/invites");
      const result = await createAcademyInviteAction({ email: teacherInvite.email, fullName: teacherInvite.fullName, role: "TEACHER" });
      if (!result.ok) { toast.error(result.error || (en ? "Unable to invite the teacher." : "تعذر إرسال دعوة المدرس.")); return; }
      setInviteSent(true);
      if (result.emailSent) toast.success(en ? "Teacher invitation sent by email." : "تم إرسال دعوة المدرس بالبريد.");
      else toast.warning(result.emailError ?? (en ? "Invitation created, but email could not be sent. You can share it from Settings." : "تم إنشاء الدعوة، لكن تعذّر إرسال البريد. يمكنك مشاركتها من الإعدادات."));
    } catch { toast.error(en ? "Unable to create the invitation now. You can send it later from Settings." : "تعذر إنشاء الدعوة الآن. يمكنك إرسالها من الإعدادات لاحقًا."); }
    finally { setSendingInvite(false); }
  };

  const next = () => { if (step < 3) setStep(step + 1); else complete(); };
  return (
    <div dir={en ? "ltr" : "rtl"} className="mx-auto max-w-xl space-y-6">
      <div><h1 className="text-2xl font-semibold">{en ? "Welcome to MYAcademy" : "أهلًا بك في MY Academy"}</h1><p className="mt-1 text-sm text-muted-foreground">{en ? "Set up your academy in minutes, then add students and get to work." : "جهّز أكاديميتك خلال دقائق ثم أضف طلابك وابدأ العمل."}</p></div>
      <div className="flex items-center gap-2">{steps.map((title, i) => <React.Fragment key={title}><div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><span>{i + 1}</span>{title}</div>{i < steps.length - 1 && <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />}</React.Fragment>)}</div>
      <Card><CardContent className="space-y-4 p-6">
        {step === 0 && <><h2 className="font-semibold">{en ? "Academy details" : "بيانات الأكاديمية"}</h2><div className="space-y-1.5"><Label>{en ? "Academy name" : "اسم الأكاديمية"}</Label><Input value={academy.name} onChange={(e) => setAcademy(a => ({ ...a, name: e.target.value }))} placeholder={en ? "Elite Academy" : "أكاديمية التميز"} /></div><div className="space-y-1.5"><Label>{en ? "Phone number" : "رقم الهاتف"}</Label><Input dir="ltr" value={academy.phone} onChange={(e) => setAcademy(a => ({ ...a, phone: e.target.value }))} placeholder="+20 10 0000 0000" /></div><div className="space-y-1.5"><Label>{en ? "Address" : "العنوان"}</Label><Input value={academy.address} onChange={(e) => setAcademy(a => ({ ...a, address: e.target.value }))} placeholder={en ? "City, governorate" : "المدينة، المحافظة"} /></div></>}
        {step === 1 && <><h2 className="font-semibold">{en ? "Create your first subject" : "أنشئ أول مادة"}</h2><div className="space-y-1.5"><Label>{en ? "Subject name" : "اسم المادة"}</Label><Input value={course.name} onChange={(e) => setCourse(c => ({ ...c, name: e.target.value }))} placeholder={en ? "Mathematics" : "الرياضيات"} /></div><div className="flex flex-wrap gap-2 pt-1">{["#7c5cfc", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"].map(col => <button key={col} type="button" aria-label={en ? "Choose color" : "اختر اللون"} onClick={() => setCourse(c => ({ ...c, color: col }))} className={cn("h-7 w-7 rounded-full border-2", course.color === col ? "border-foreground" : "border-transparent")} style={{ background: col }} />)}</div></>}
        {step === 2 && <><h2 className="font-semibold">{en ? "Invite your first teacher" : "أضف أول مدرس ثم جهّز المجموعة"}</h2><p className="text-sm leading-6 text-muted-foreground">{en ? "You do not need to open Settings. Invite a teacher here, then create a group from Groups and select its subject, teacher, and schedule." : "لا تحتاج إلى فتح الإعدادات. أرسل دعوة المدرس من هنا، وبعد قبوله لها أنشئ المجموعة من صفحة المجموعات وحدد المادة والمدرس والموعد."}</p><div className="rounded-lg border bg-muted/20 p-4">{inviteSent ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{en ? "Teacher invitation created successfully. You can continue setup." : "تم إنشاء دعوة المدرس بنجاح. يمكنك متابعة الإعداد الآن."}</p> : <div className="space-y-3"><div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-primary" />{en ? "Teacher invitation" : "دعوة المدرس"}</div><Input value={teacherInvite.fullName} onChange={(e) => setTeacherInvite(v => ({ ...v, fullName: e.target.value }))} placeholder={en ? "Teacher name (optional)" : "اسم المدرس (اختياري)"} /><Input dir="ltr" type="email" value={teacherInvite.email} onChange={(e) => setTeacherInvite(v => ({ ...v, email: e.target.value }))} placeholder="teacher@example.com" /><Button variant="outline" size="sm" onClick={sendTeacherInvite} disabled={sendingInvite}>{sendingInvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{en ? "Send invitation" : "إرسال الدعوة"}</Button></div>}</div></>}
        {step === 3 && <div className="flex flex-col items-center gap-3 py-6 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-500" /><h2 className="text-lg font-semibold">{en ? "Your academy is ready!" : "أكاديميتك جاهزة!"}</h2><p className="text-sm text-muted-foreground">{en ? "The basics are set. After the teacher accepts the invitation, create your group from Groups and choose the subject, teacher, and schedule." : "تم إعداد الأساسيات. بعد قبول المدرس للدعوة، أنشئ مجموعتك من صفحة المجموعات وحدد المادة والمدرس والموعد."}</p><div className="grid w-full gap-3 pt-2 text-left sm:grid-cols-2"><div className="rounded-lg border bg-muted/20 p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Upload className="h-4 w-4 text-primary" />{en ? "Import students" : "استيراد الطلاب"}</div><p className="mb-3 text-xs leading-5 text-muted-foreground">{en ? "Upload a CSV file or paste data to add students and parents in bulk." : "ارفع ملف CSV أو الصق البيانات لإضافة الطلاب وأولياء الأمور دفعة واحدة."}</p><Button variant="outline" size="sm" onClick={() => complete("/students/import")} disabled={loading}>{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{en ? "Open student import" : "فتح استيراد الطلاب"}</Button></div><div className="rounded-lg border bg-muted/20 p-4"><div className="mb-2 flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-primary" />{en ? "Invite first teacher" : "دعوة أول مدرس"}</div>{inviteSent ? <p className="text-xs leading-5 text-emerald-700">{en ? "Invitation created successfully. The teacher will appear after accepting it." : "تم إنشاء الدعوة بنجاح. سيظهر المدرس في الأكاديمية بعد قبولها."}</p> : <div className="space-y-2"><Input value={teacherInvite.fullName} onChange={(e) => setTeacherInvite(v => ({ ...v, fullName: e.target.value }))} placeholder={en ? "Teacher name (optional)" : "اسم المدرس (اختياري)"} /><Input dir="ltr" type="email" value={teacherInvite.email} onChange={(e) => setTeacherInvite(v => ({ ...v, email: e.target.value }))} placeholder="teacher@example.com" /><Button variant="outline" size="sm" onClick={sendTeacherInvite} disabled={sendingInvite}>{sendingInvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{en ? "Send invitation" : "إرسال الدعوة"}</Button></div>}</div></div></div>}
      </CardContent></Card>
      <div className="flex justify-between"><Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : complete()} disabled={loading}>{step > 0 ? (en ? "Back" : "السابق") : (en ? "Skip for now" : "تخطّي الآن")}</Button><Button onClick={next} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} {step === 3 ? (en ? "Go to dashboard" : "الذهاب إلى لوحة التحكم") : (en ? "Next" : "التالي")}</Button></div>
    </div>
  );
}
