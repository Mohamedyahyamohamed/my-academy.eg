"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginValues } from "@/schemas";
import { roleHome } from "@/lib/auth";
import { useClientLang } from "@/lib/i18n-client";

export function LoginForm() {
  const router = useRouter();
  const lang = useClientLang();
  const en = lang === "en";
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error ?? (en ? "Sign-in failed." : "فشل تسجيل الدخول")); return; }
      toast.success(en ? `Welcome, ${data.user.full_name.split(" ")[0]}!` : `أهلاً ${data.user.full_name.split(" ")[0]}!`);
      router.push(roleHome(data.user.role));
      router.refresh();
    } catch { toast.error(en ? "Something went wrong. Please try again." : "حصل خطأ. حاول تاني."); }
    finally { setLoading(false); }
  };

  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
    <div className="space-y-1.5"><Label htmlFor="email">{en ? "Email address" : "البريد الإلكتروني"}</Label><div className="relative"><Mail className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${en ? "left-3" : "right-3"}`} /><Input id="email" type="email" autoComplete="email" placeholder="you@academy.edu" className={en ? "pl-9" : "pr-9"} {...register("email")} /></div>{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
    <div className="space-y-1.5"><div className="flex items-center justify-between"><Label htmlFor="password">{en ? "Password" : "كلمة المرور"}</Label><a href="/forgot-password" className="text-xs font-medium text-primary hover:underline">{en ? "Forgot password?" : "نسيت كلمة المرور؟"}</a></div><div className="relative"><Lock className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${en ? "left-3" : "right-3"}`} /><Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className={en ? "pl-9" : "pr-9"} {...register("password")} /></div>{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}</div>
    <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {en ? "Signing in…" : "جارٍ الدخول…"}</> : <>{en ? "Sign in" : "تسجيل الدخول"} <ArrowLeft className={`h-4 w-4 ${en ? "rotate-180" : ""}`} /></>}</Button>
  </form>;
}
