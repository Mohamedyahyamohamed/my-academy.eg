"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { resetSchema, type ResetValues } from "@/schemas";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ResetValues) => {
    setLoading(true);
    try {
      const res = await requestPasswordResetAction(values.email);
      if (!res.ok) {
        toast.error(res.error ?? "حدث خطأ، حاول مرة أخرى");
        return;
      }
      setSent(true);
      toast.success("تم إرسال طلب استعادة كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {sent ? (
          <div className="card-surface p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold">تحقّق من بريدك الإلكتروني</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              إذا كان البريد مسجّلًا لدينا، فقد أرسلنا لك تعليمات استعادة كلمة المرور.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">العودة لتسجيل الدخول</Link>
            </Button>
          </div>
        ) : (
          <div className="card-surface p-8">
            <h1 className="text-xl font-semibold tracking-tight">
              استعادة كلمة المرور
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@academy.edu"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الإرسال…
                  </>
                ) : (
                  "إرسال رابط الاستعادة"
                )}
              </Button>
            </form>
          </div>
        )}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
