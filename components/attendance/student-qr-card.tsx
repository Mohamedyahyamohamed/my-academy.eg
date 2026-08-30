"use client";

import * as React from "react";
import { Copy, Download, Eye, EyeOff, Loader2, QrCode, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { generatePortalCredentialsAction } from "@/app/actions/portal-auth";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";
import { studentQrValue } from "@/lib/student-qr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** A student's personal QR card. Staff can also reveal/reset shared portal credentials. */
export function StudentQrCard({
  studentId,
  name,
  grade,
  academyName,
  trigger,
  canManageCredentials = false,
}: {
  studentId: string;
  name: string;
  grade?: string | null;
  academyName: string;
  trigger?: React.ReactNode;
  canManageCredentials?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [loadingCredentials, setLoadingCredentials] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const en = useClientLang() === "en";
  const value = studentQrValue(studentId, typeof window !== "undefined" ? window.location.origin : undefined);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const loadCredentials = async () => {
    if (!canManageCredentials || loadingCredentials) return;
    setLoadingCredentials(true);
    try {
      const result = await generatePortalCredentialsAction(studentId);
      setCredentials({ email: result.email, password: result.password });
      setShowPassword(true);
      toast.success(en ? "Portal credentials are ready." : "بيانات دخول الطالب وولي الأمر جاهزة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Could not load credentials." : "تعذر تحميل بيانات الدخول."));
    } finally {
      setLoadingCredentials(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(en ? `${label} copied.` : `تم نسخ ${label}.`);
  };

  const download = async () => {
    const svg = cardRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 720);
      ctx.fillStyle = "#7c5cfc";
      ctx.fillRect(0, 0, 600, 90);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(academyName.slice(0, 24), 300, 55);
      ctx.drawImage(img, 120, 130, 360, 360);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(name.slice(0, 22), 300, 540);
      ctx.fillStyle = "#64748b";
      ctx.font = "24px sans-serif";
      ctx.fillText(grade ?? (en ? "Student" : "الطالب"), 300, 580);
      ctx.font = "18px sans-serif";
      ctx.fillText(en ? "Show this to your teacher to check in" : "اعرضها لمعلمك لتسجيل الحضور", 300, 660);
      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = `${name.replace(/\s+/g, "_")}_qr.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && canManageCredentials && !credentials) void loadCredentials();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <QrCode className="me-2 h-4 w-4" /> {en ? "My QR card" : "بطاقة رمز QR الخاصة بي"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>{en ? "Student QR card" : "بطاقة QR للطالب"}</DialogTitle>
        </DialogHeader>
        <div ref={cardRef} className="mx-auto w-full max-w-[260px] rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{academyName}</p>
          <div className="my-3 flex justify-center rounded-lg bg-white p-2">
            <QRCodeSVG value={value} size={200} level="M" />
          </div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{grade ?? (en ? "Student" : "الطالب")}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {en ? "Save or screenshot this image and show it to the teacher when checking in." : "احفظ الصورة أو صوّرها وأظهرها للمعلم عند تسجيل الحضور."}
        </p>
        {canManageCredentials && (
          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">{en ? "Student & parent portal login" : "دخول الطالب وولي الأمر"}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadCredentials()} disabled={loadingCredentials}>
                {loadingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ms-1">{en ? "New password" : "كلمة مرور جديدة"}</span>
              </Button>
            </div>
            {loadingCredentials && <p className="text-xs text-muted-foreground">{en ? "Loading credentials…" : "جارٍ تحميل بيانات الدخول…"}</p>}
            {credentials && (
              <>
                <CredentialRow label={en ? "Email" : "البريد"} value={credentials.email} onCopy={() => void copy(credentials.email, en ? "Email" : "البريد" )} />
                <CredentialRow label={en ? "Password" : "كلمة المرور"} value={showPassword ? credentials.password : "••••••••"} onCopy={() => void copy(credentials.password, en ? "Password" : "كلمة المرور")} onToggle={() => setShowPassword((visible) => !visible)} hidden={!showPassword} />
                <p className="text-[11px] leading-5 text-muted-foreground">{en ? "Use these same credentials and choose Student or Parent on the portal login page." : "استخدم نفس البيانات واختر طالب أو ولي أمر من صفحة دخول البوابة."}</p>
              </>
            )}
          </div>
        )}
        <Button onClick={download} className="w-full">
          <Download className="me-2 h-4 w-4" /> {en ? "Download QR image" : "تنزيل صورة رمز QR"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({ label, value, onCopy, onToggle, hidden = false }: { label: string; value: string; onCopy: () => void; onToggle?: () => void; hidden?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background p-2 text-xs">
      <span className="w-16 shrink-0 font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate" dir="ltr">{value}</span>
      {onToggle && <Button type="button" variant="ghost" size="icon" aria-label={hidden ? "Show password" : "Hide password"} onClick={onToggle}>{hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>}
      <Button type="button" variant="ghost" size="icon" aria-label="Copy" onClick={onCopy}><Copy className="h-4 w-4" /></Button>
    </div>
  );
}
