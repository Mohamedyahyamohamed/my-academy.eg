"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";

const DEMO_EMAIL = "admin@myacademy.edu";

/**
 * شارة واضحة تظهر حين يكون المستخدم داخل الحساب التجريبي،
 * مع دعوة لإنشاء حساب حقيقي. قابلة للإغلاق ومتجاوبة مع الشاشات الصغيرة.
 */
export function DemoBanner({ user }: { user: SessionUser }) {
  const [closed, setClosed] = React.useState(false);
  if (user.email.toLowerCase() !== DEMO_EMAIL || closed) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gradient-to-l from-brand-600 to-brand-800 px-4 py-2 text-center text-xs text-white sm:text-sm">
      <Sparkles className="hidden h-4 w-4 shrink-0 sm:block" />
      <span className="min-w-0">
        أنت الآن في <strong>وضع العرض التجريبي</strong> — البيانات تجريبية وقد تُعاد ضبطها.
      </span>
      <Button asChild size="sm" variant="secondary" className="h-7 shrink-0">
        <Link href="/signup">ابدأ أكاديميتك الآن</Link>
      </Button>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="إغلاق"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
