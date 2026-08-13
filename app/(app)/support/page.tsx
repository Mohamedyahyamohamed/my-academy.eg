import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { SupportDesk } from "@/components/support/support-desk";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/services/session";
import { listSupportTickets, type SupportTicket } from "@/services/support";
import { isSupabaseConfigured } from "@/services/supabase/config";

export default async function SupportPage() {
  const user = requireUser();
  const available = isSupabaseConfigured();
  let tickets: SupportTicket[] = [];
  try {
    tickets = await listSupportTickets(user);
  } catch {
    // The support form remains available and will provide a specific action error.
    tickets = [];
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-2xl bg-gradient-to-l from-brand-700 to-brand-500 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-brand-100"><LifeBuoy className="h-5 w-5" /><span className="text-sm font-medium">الدعم داخل MY Academy</span></div><h1 className="text-2xl font-bold">كيف نساعدك اليوم؟</h1><p className="mt-2 text-sm leading-6 text-brand-50">ابدأ بالدليل السريع حسب دورك، ثم افتح طلبًا بمعلومات كافية إذا احتجت متابعة من فريق المنصة.</p></div>
          <Button asChild variant="secondary"><Link href="/help">مركز المساعدة <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
      <SupportDesk initialTickets={tickets} available={available} />
    </main>
  );
}
