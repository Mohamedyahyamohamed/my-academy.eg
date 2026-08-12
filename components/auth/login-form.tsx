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

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "فشل تسجيل الدخول");
        return;
      }
      toast.success(`أهلاً ${data.user.full_name.split(" ")[0]}!`);
      router.push(roleHome(data.user.role));
      router.refresh();
    } catch {
      toast.error("حصل خطأ. حاول تاني.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@academy.edu"
            className="pr-9"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">كلمة المرور</Label>
          <a
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            نسيت كلمة المرور؟
          </a>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-9"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الدخول…
          </>
        ) : (
          <>
            تسجيل الدخول <ArrowLeft className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
