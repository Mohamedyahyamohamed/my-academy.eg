import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";

const DEMO_EMAIL = "admin@myacademy.edu";

/**
 * شارة واضحة تظهر حين يكون المستخدم داخل الحساب التجريبي،
 * مع دعوة لإنشاء حساب حقيقي.
 */
export function DemoBanner({ user }: { user: SessionUser }) {
  if (user.email.toLowerCase() !== DEMO_EMAIL) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gradient-to-l from-brand-600 to-brand-800 px-4 py-2 text-center text-sm text-white">
      <Sparkles className="hidden h-4 w-4 shrink-0 sm:block" />
      <span>
        أنت الآن في <strong>وضع العرض التجريبي</strong> — البيانات تجريبية وقد تُعاد ضبطها.
      </span>
      <Button asChild size="sm" variant="secondary" className="h-7 shrink-0">
        <Link href="/signup">ابدأ أكاديميتك الآن</Link>
      </Button>
    </div>
  );
}
