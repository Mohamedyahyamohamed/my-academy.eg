"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClientLang } from "@/lib/i18n-client";

export function AcademyBranding({ academy }: { academy: any }) {
  const en = useClientLang() === "en";
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
      toast.success(en ? "Academy branding saved." : "تم حفظ هوية الأكاديمية");
    } catch {
      toast.error(en ? "Unable to save branding." : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">{en ? "Academy branding" : "هوية الأكاديمية"}</CardTitle>
        <CardDescription>{en ? "Customize your logo and color — they appear across the platform and reports." : "خصّص شعارك ولونك — يظهر في كل الموقع + الكشوفات."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>{en ? "Primary color" : "اللون الأساسي"}</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-border"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-[120px] font-mono" />
            <div className="flex-1 rounded-lg p-3 text-center text-sm font-medium text-white" style={{ backgroundColor: color }}>
              {en ? "Preview" : "معاينة"}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{en ? "Logo URL" : "رابط الشعار (URL)"}</Label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {logoUrl && (
            <Image src={logoUrl} alt={en ? "Academy logo preview" : "معاينة شعار الأكاديمية"} width={64} height={64} unoptimized className="mt-2 h-16 w-16 rounded-lg border border-border object-contain" />
          )}
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {en ? "Save branding" : "حفظ الهوية"}
        </Button>
      </CardContent>
    </Card>
  );
}
