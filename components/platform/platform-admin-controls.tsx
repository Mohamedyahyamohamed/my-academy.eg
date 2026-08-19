"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldOff, Trash2, Power, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPlatformUserStatus, deletePlatformUser, deletePlatformAcademy, setPlatformAcademyStatus, setPlatformSubscriptionAction } from "@/app/actions/platform";

type UserRow = { id: string; email: string; role: string; is_active: boolean };
type AcademyRow = { id: string; name: string; is_active?: boolean };
type SubscriptionRow = {
  academy_id: string;
  status?: string | null;
  provider?: string | null;
  provider_subscription_id?: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: string | null;
};

export function PlatformUserControls({ users, en = false }: { users: UserRow[]; en?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      if (!result.ok) toast.error(result.error || (en ? "Could not complete the operation." : "تعذر تنفيذ العملية"));
      else {
        toast.success(en ? "Platform data updated." : "تم تحديث بيانات المنصة");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.role} · {user.is_active ? (en ? "Active" : "نشط") : (en ? "Suspended" : "موقوف")}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setPlatformUserStatus(user.id, !user.is_active))}
          >
            <ShieldOff className="h-4 w-4" /> {user.is_active ? (en ? "Suspend" : "إيقاف") : (en ? "Activate" : "تفعيل")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (window.confirm(en ? "This permanently deletes the user account and its data. Continue?" : "سيتم حذف المستخدم وبيانات حسابه نهائيًا. هل تريد المتابعة؟")) run(() => deletePlatformUser(user.id));
            }}
          >
            <Trash2 className="h-4 w-4" /> {en ? "Delete" : "حذف"}
          </Button>
        </div>
      ))}
      {!users.length && <p className="text-sm text-muted-foreground">{en ? "No other users." : "لا يوجد مستخدمون آخرون."}</p>}
    </div>
  );
}

export function PlatformSubscriptionControls({ subscriptions, en = false }: { subscriptions: Array<SubscriptionRow & { name: string }>; en?: boolean }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (academyId: string, action: Parameters<typeof setPlatformSubscriptionAction>[1], message: string) => {
    setPendingKey(`${academyId}:${action}`);
    startTransition(async () => {
      const result = await setPlatformSubscriptionAction(academyId, action);
      setPendingKey(null);
      if (!result.ok) toast.error(result.error || (en ? "Could not update subscription." : "تعذر تحديث الاشتراك"));
      else { toast.success(message); router.refresh(); }
    });
  };

  return (
    <div className="space-y-3">
      {subscriptions.map((subscription) => {
        const serviceSuspended = subscription.status === "canceled" || subscription.status === "expired";
        const scheduled = Boolean(subscription.cancel_at_period_end);
        return (
          <div key={subscription.academy_id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subscription.name}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.provider || (en ? "No provider" : "بدون مزود")} · {subscription.status || (en ? "No subscription" : "بدون اشتراك")}
                  {scheduled ? (en ? " · cancellation scheduled" : " · الإلغاء مجدول") : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingKey !== null}
                  onClick={() => {
                    const action = serviceSuspended ? "resume_service" : "suspend_service";
                    const text = serviceSuspended
                      ? (en ? `Reactivate service for «${subscription.name}»?` : `هل تريد إعادة تفعيل خدمة «${subscription.name}»؟`)
                      : (en ? `Suspend service for «${subscription.name}»? This preserves data.` : `هل تريد إيقاف خدمة «${subscription.name}»؟ ستظل البيانات محفوظة.`);
                    if (window.confirm(text)) run(subscription.academy_id, action, serviceSuspended ? (en ? "Service reactivated" : "تمت إعادة تفعيل الخدمة") : (en ? "Service suspended" : "تم إيقاف الخدمة"));
                  }}
                >
                  <Power className="h-4 w-4" /> {serviceSuspended ? (en ? "Reactivate service" : "إعادة تفعيل الخدمة") : (en ? "Suspend service" : "إيقاف الخدمة")}
                </Button>
                {subscription.provider_subscription_id && subscription.provider === "stripe" && (
                  <Button
                    size="sm"
                    variant={scheduled ? "secondary" : "outline"}
                    disabled={pendingKey !== null}
                    onClick={() => {
                      const action = scheduled ? "undo_cancel" : "cancel_at_period_end";
                      const text = scheduled
                        ? (en ? `Undo scheduled cancellation for «${subscription.name}»?` : `هل تريد التراجع عن إلغاء اشتراك «${subscription.name}»؟`)
                        : (en ? `Cancel «${subscription.name}» at the end of the paid period?` : `هل تريد إلغاء اشتراك «${subscription.name}» في نهاية الفترة المدفوعة؟`);
                      if (window.confirm(text)) run(subscription.academy_id, action, scheduled ? (en ? "Scheduled cancellation undone" : "تم التراجع عن الإلغاء المجدول") : (en ? "Cancellation scheduled" : "تم جدولة الإلغاء"));
                    }}
                  >
                    <CreditCard className="h-4 w-4" /> {scheduled ? (en ? "Undo cancellation" : "التراجع عن الإلغاء") : (en ? "Cancel at period end" : "إلغاء بنهاية الفترة")}
                  </Button>
                )}
              </div>
            </div>
            {subscription.provider === "paymob" && <p className="mt-2 text-xs text-muted-foreground">{en ? "Paymob cancellation is not automated here; suspend service locally or cancel from Paymob." : "إلغاء Paymob غير آلي من هنا؛ يمكنك إيقاف الخدمة محليًا أو الإلغاء من لوحة Paymob."}</p>}
          </div>
        );
      })}
      {!subscriptions.length && <p className="text-sm text-muted-foreground">{en ? "No subscriptions to manage." : "لا توجد اشتراكات لإدارتها."}</p>}
    </div>
  );
}

export function PlatformAcademyControls({ academies, en = false }: { academies: AcademyRow[]; en?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      {academies.map((academy) => (
        <div key={academy.id} className="flex items-center gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{academy.name || (en ? "Unnamed academy" : "أكاديمية بلا اسم")}</p>
            <p className="text-xs text-muted-foreground">{academy.is_active === false ? (en ? "Suspended" : "موقوفة") : (en ? "Active" : "نشطة")}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const next = academy.is_active === false;
              if (!next && !window.confirm(en ? `This suspends «${academy.name}» while preserving all data. Continue?` : `سيتم إيقاف خدمة «${academy.name}» مع الحفاظ على جميع البيانات. هل تريد المتابعة؟`)) return;
              startTransition(async () => {
                const result = await setPlatformAcademyStatus(academy.id, next);
                if (!result.ok) toast.error(result.error || (en ? "Could not update academy status" : "تعذر تحديث حالة الأكاديمية"));
                else { toast.success(next ? (en ? "Academy activated" : "تم تفعيل الأكاديمية") : (en ? "Academy suspended" : "تم إيقاف الأكاديمية مؤقتًا")); router.refresh(); }
              });
            }}
          >
            <Power className="h-4 w-4" /> {academy.is_active === false ? (en ? "Activate" : "تفعيل") : (en ? "Suspend" : "إيقاف مؤقت")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(en ? `This permanently deletes «${academy.name}» and its data. Continue?` : `سيتم حذف أكاديمية «${academy.name}» وكل بياناتها نهائيًا. هل تريد المتابعة؟`)) return;
              startTransition(async () => {
                const result = await deletePlatformAcademy(academy.id);
                if (!result.ok) toast.error(result.error || (en ? "Could not delete academy" : "تعذر حذف الأكاديمية"));
                else { toast.success(en ? "Academy deleted" : "تم حذف الأكاديمية"); router.refresh(); }
              });
            }}
          >
            <Trash2 className="h-4 w-4" /> {en ? "Delete academy" : "حذف الأكاديمية"}
          </Button>
        </div>
      ))}
    </div>
  );
}
