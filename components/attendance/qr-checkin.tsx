"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/** Teacher shows a signed, short-lived QR for student self check-in. */
export function QrCheckin({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [token, setToken] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [remaining, setRemaining] = React.useState(0);

  const generate = async () => {
    const res = await fetch("/api/qr-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.token) { setToken(res.token); setExpiresAt(res.expiresAt); }
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

  const url = token ? `${origin}/checkin?token=${token}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !token) generate(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><QrCode className="h-4 w-4" /> تسجيل الحضور بالـ QR</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>حضور آمن بالـ QR</DialogTitle>
          <DialogDescription>
            Token expires in {remaining > 0 ? `${remaining}s` : "—"}. Students scan to check in.
          </DialogDescription>
        </DialogHeader>
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
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={generate}><RefreshCw className="h-4 w-4" /> إنشاء رمز QR</Button>
        )}
        <Button variant="outline" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" /> Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
