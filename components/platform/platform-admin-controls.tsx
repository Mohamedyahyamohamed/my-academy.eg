"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ShieldOff, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPlatformUserStatus, deletePlatformUser, deletePlatformAcademy, setPlatformAcademyStatus } from "@/app/actions/platform";

type UserRow = { id: string; email: string; role: string; is_active: boolean };
type AcademyRow = { id: string; name: string; is_active?: boolean };

export function PlatformUserControls({ users, en = false }: { users: UserRow[]; en?: boolean }) {
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
