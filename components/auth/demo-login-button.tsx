"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roleHome } from "@/lib/auth";
import { toast } from "sonner";

interface DemoLoginButtonProps {
  email: string;
  password: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  fullWidth?: boolean;
}

/**
 * زر دخول تجريبي مباشر — يبعت بيانات الدخول لـ /api/auth/login
 * ويحوّل المستخدم لصفحته المناسبة حسب الدور.
 */
export function DemoLoginButton({
  email,
  password,
  label = "دخول تجريبي مباشر",
  variant = "outline",
  className,
  fullWidth,
}: DemoLoginButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`أهلاً ${data.user.full_name.split(" ")[0]}!`);
        router.push(roleHome(data.user.role));
        router.refresh();
      } else {
        toast.error(data.error ?? "تعذّر الدخول التجريبي");
      }
    } catch {
      toast.error("حصل خطأ. حاول تاني.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handle}
      variant={variant}
      disabled={loading}
      className={className}
      style={fullWidth ? { width: "100%" } : undefined}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الدخول…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" /> {label}
        </>
      )}
    </Button>
  );
}
