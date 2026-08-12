"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, joinAcademyAction } from "@/app/actions/signup";

type Mode = "owner" | "parent" | "student";

const TABS: { id: Mode; label: string }[] = [
  { id: "owner", label: "صاحب أكاديمية" },
  { id: "parent", label: "ولي أمر" },
  { id: "student", label: "طالب" },
];

export function SignupForm() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("owner");
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    academyName: "",
    academyCode: "",
    fullName: "",
    email: "",
    password: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res: { ok?: boolean; error?: string } | undefined;
      if (mode === "owner") {
        res = await signupAction({
          academyName: form.academyName,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        });
      } else {
        res = await joinAcademyAction({
          role: mode === "parent" ? "PARENT" : "STUDENT",
          academyCode: form.academyCode,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        });
      }
      if (res && res.ok === false) {
        toast.error(res.error ?? "فشل التسجيل");
        setLoading(false);
        return;
      }
      toast.success(mode === "owner" ? "أهلًا بأكاديميتك! 🎉" : "تم التسجيل! 🎉");
      router.refresh();
    } catch {
      // redirect() throws on the client; ignore.
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* اختيار الدور */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={`rounded-md px-2 py-2 text-xs font-medium transition ${
              mode === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === "owner"
          ? "ستنشئ أكاديمية جديدة وتكون مديرها — تحكّم كامل في الطلاب والمدرّسين والمصاريف والتقارير."
          : mode === "parent"
            ? "انضم لبوابة أولياء الأمور لمتابعة درجات ابنك وحضوره ومصاريفه. (تحتاج كود الأكاديمية)"
            : "انضم لبوابة الطلاب للاطّلاع على جدولك وواجباتك ودرجاتك. (تحتاج كود الأكاديمية)"}
      </p>

      {mode === "owner" ? (
        <div className="space-y-1.5">
          <Label htmlFor="academy">اسم الأكاديمية</Label>
          <Input
            id="academy"
            placeholder="MY Academy"
            value={form.academyName}
            onChange={(e) => set("academyName", e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="code">كود الأكاديمية</Label>
          <Input
            id="code"
            placeholder="اكتب كود الأكاديمية اللي هتنضم ليها"
            value={form.academyCode}
            onChange={(e) => set("academyCode", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            الكود بييجيك من الأكاديمية (صاحب الأكاديمية بيبعته).
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">الاسم</Label>
        <Input
          id="name"
          placeholder="الاسم بالكامل"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          placeholder="6 حروف على الأقل"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التسجيل…
          </>
        ) : (
          <>
            {mode === "owner" ? "إنشاء أكاديمية" : "انضمام"} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
