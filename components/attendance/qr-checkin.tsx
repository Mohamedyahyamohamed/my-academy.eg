"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useClientLang } from "@/lib/i18n-client";

/** Teacher shows a signed, short-lived QR for student self check-in. */
export function QrCheckin({ lessonId, groupId }: { lessonId: string; groupId?: string }) {
  const en = useClientLang() === "en";
  const [open, setOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [token, setToken] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [remaining, setRemaining] = React.useState(0);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState("");

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/qr-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, groupId }),
      });
      const res = await response.json().catch(() => null);
      if (!response.ok || !res?.token) {
        setToken("");
        setExpiresAt(0);
        setError(
          res?.message || res?.error ||
          (en ? "Unable to create a QR code for this lesson." : "تعذّر إنشاء رمز QR لهذه الحصة."),
        );
        return;
      }
      setToken(res.token);
      setExpiresAt(Number(res.expiresAt) || 0);
    } catch {
      setToken("");
      setExpiresAt(0);
      setError(en ? "Network error. Please try again." : "حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setGenerating(false);
    }
  };

  React.useEffect(() => { if (typeof window !== "undefined") setOrigin(window.location.origin); }, []);

  React.useEffect(() => {
    if (!open || !expiresAt) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { setToken(""); setExpiresAt(0); }
    }, 1000);
    return () => clearInterval(timer);
  }, [open, expiresAt]);

  const url = token ? `${origin || (typeof window !== "undefined" ? window.location.origin : "")}/checkin?token=${token}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !token) generate(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><QrCode className="h-4 w-4" /> {en ? "QR attendance" : "تسجيل الحضور بالـ QR"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>{en ? "Secure QR attendance" : "حضور آمن بالـ QR"}</DialogTitle>
          <DialogDescription>
            {en ? "Token expires in" : "ينتهي الرمز خلال"} {remaining > 0 ? `${remaining}s` : "—"}. {en ? "Students scan to check in." : "يمسح الطلاب الرمز لتسجيل الحضور."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {token ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <QRCodeSVG value={url} size={200} level="M" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={remaining > 30 ? "success" : remaining > 0 ? "warning" : "destructive"}>
                <Clock className="h-3 w-3" /> {remaining}s
              </Badge>
              <Button size="sm" variant="ghost" onClick={generate}>
                <RefreshCw className="h-3.5 w-3.5" /> {en ? "Refresh" : "تحديث"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={generate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? (en ? "Creating…" : "جارٍ إنشاء الرمز…") : (en ? "Generate QR code" : "إنشاء رمز QR")}
          </Button>
        )}
        <Button variant="outline" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" /> {en ? "Close" : "إغلاق"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
