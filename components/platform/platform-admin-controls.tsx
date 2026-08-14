"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ShieldOff, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPlatformUserStatus, deletePlatformUser, deletePlatformAcademy, setPlatformAcademyStatus } from "@/app/actions/platform";

type UserRow = { id: string; email: string; role: string; is_active: boolean };
type AcademyRow = { id: string; name: string; is_active?: boolean };

export function PlatformUserControls({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      if (!result.ok) toast.error(result.error || "تعذر تنفيذ العملية");
      else {
        toast.success("تم تحديث بيانات المنصة");
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
            <p className="text-xs text-muted-foreground">{user.role} · {user.is_active ? "نشط" : "موقوف"}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setPlatformUserStatus(user.id, !user.is_active))}
          >
            <ShieldOff className="h-4 w-4" /> {user.is_active ? "إيقاف" : "تفعيل"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (window.confirm("سيتم حذف المستخدم وبيانات حسابه نهائيًا. هل تريد المتابعة؟")) run(() => deletePlatformUser(user.id));
            }}
          >
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
        </div>
      ))}
      {!users.length && <p className="text-sm text-muted-foreground">لا يوجد مستخدمون آخرون.</p>}
    </div>
  );
}

export function PlatformAcademyControls({ academies }: { academies: AcademyRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      {academies.map((academy) => (
        <div key={academy.id} className="flex items-center gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{academy.name || "أكاديمية بلا اسم"}</p>
            <p className="text-xs text-muted-foreground">{academy.is_active === false ? "موقوفة" : "نشطة"}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const next = academy.is_active === false;
              if (!next && !window.confirm(`سيتم إيقاف خدمة «${academy.name}» مع الحفاظ على جميع البيانات. هل تريد المتابعة؟`)) return;
              startTransition(async () => {
                const result = await setPlatformAcademyStatus(academy.id, next);
                if (!result.ok) toast.error(result.error || "تعذر تحديث حالة الأكاديمية");
                else { toast.success(next ? "تم تفعيل الأكاديمية" : "تم إيقاف الأكاديمية مؤقتًا"); router.refresh(); }
              });
            }}
          >
            <Power className="h-4 w-4" /> {academy.is_active === false ? "تفعيل" : "إيقاف مؤقت"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`سيتم حذف أكاديمية «${academy.name}» وكل بياناتها نهائيًا. هل تريد المتابعة؟`)) return;
              startTransition(async () => {
                const result = await deletePlatformAcademy(academy.id);
                if (!result.ok) toast.error(result.error || "تعذر حذف الأكاديمية");
                else { toast.success("تم حذف الأكاديمية"); router.refresh(); }
              });
            }}
          >
            <Trash2 className="h-4 w-4" /> حذف الأكاديمية
          </Button>
        </div>
      ))}
    </div>
  );
}
