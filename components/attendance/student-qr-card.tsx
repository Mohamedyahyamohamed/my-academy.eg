"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A student's personal QR "ID card". The QR encodes MA:<studentId>.
 * The teacher scans it to mark the student present.
 */
export function StudentQrCard({
  studentId,
  name,
  grade,
  academyName,
  trigger,
}: {
  studentId: string;
  name: string;
  grade?: string | null;
  academyName: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const value = `MA:${studentId}`;
  const cardRef = React.useRef<HTMLDivElement>(null);

  const download = async () => {
    // Render the QR SVG to a PNG the parent can save / send on WhatsApp.
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
      const ctx = canvas.getContext("2d")!;
      // card background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 720);
      ctx.fillStyle = "#7c5cfc";
      ctx.fillRect(0, 0, 600, 90);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(academyName.slice(0, 24), 300, 55);
      // QR
      ctx.drawImage(img, 120, 130, 360, 360);
      // name
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(name.slice(0, 22), 300, 540);
      ctx.fillStyle = "#64748b";
      ctx.font = "24px sans-serif";
      ctx.fillText(grade ?? "Student", 300, 580);
      ctx.font = "18px sans-serif";
      ctx.fillText("Show this to your teacher to check in", 300, 660);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${name.replace(/\s+/g, "_")}_qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4" /> My QR card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Student QR card</DialogTitle>
        </DialogHeader>
        <div ref={cardRef} className="mx-auto w-full max-w-[260px] rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{academyName}</p>
          <div className="my-3 flex justify-center rounded-lg bg-white p-2">
            <QRCodeSVG value={value} size={200} level="M" />
          </div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{grade ?? "Student"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          احفظ الصورة أو صورها سكرين شوت وابعتها على الواتساب. اعرضها للمعلّم عند الحضور.
        </p>
        <Button onClick={download} className="w-full">
          <Download className="h-4 w-4" /> Download QR image
        </Button>
      </DialogContent>
    </Dialog>
  );
}
