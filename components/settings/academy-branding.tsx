"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AcademyBranding({ academy }: { academy: any }) {
  const [color, setColor] = React.useState(academy.primary_color ?? "#7c5cfc");
  const [logoUrl, setLogoUrl] = React.useState(academy.logo_url ?? "");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { updateAcademyAction } = await import("@/app/actions/settings");
      await updateAcademyAction({
        name: academy.name,
        primary_color: color,
        logo_url: logoUrl || undefined,
      });
      document.documentElement.style.setProperty("--brand-600", color);
      toast.success("تم حفظ هوية الأكاديمية ✅");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">هوية الأكاديمية</CardTitle>
        <CardDescription>خصّص شعارك ولونك — يظهر في كل الموقع + الكشوفات.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>اللون الأساسي</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-border"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-[120px] font-mono" />
            <div className="flex-1 rounded-lg p-3 text-center text-sm font-medium text-white" style={{ backgroundColor: color }}>
              معاينة
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>رابط الشعار (URL)</Label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {logoUrl && (
            <img src={logoUrl} alt="logo" className="mt-2 h-16 w-16 rounded-lg border border-border object-contain" />
          )}
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          حفظ الهوية
        </Button>
      </CardContent>
    </Card>
  );
}
