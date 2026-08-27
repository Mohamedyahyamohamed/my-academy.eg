"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteUserAction } from "@/app/actions/settings";
import { useClientLang } from "@/lib/i18n-client";

export function UserDeleteButton({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = useClientLang();
  const en = lang === "en";

  async function onConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await deleteUserAction(userId);
      if (!res.ok) {
        setError(res.error || (en ? "Failed to delete user." : "تعذّر حذف المستخدم."));
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError(en ? "Failed to delete user." : "تعذّر حذف المستخدم.");
      setLoading(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-rose-600"
            disabled={disabled || loading}
            title={en ? "Delete user" : "حذف المستخدم"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        onConfirm={onConfirm}
        title={en ? "Delete this user?" : "حذف هذا المستخدم؟"}
        description={
          en
            ? `Delete ${userName} from this academy. This action cannot be undone.`
            : `حذف ${userName} من هذه الأكاديمية. لا يمكن التراجع عن هذا الإجراء.`
        }
        confirmLabel={en ? "Delete" : "حذف"}
        cancelLabel={en ? "Cancel" : "إلغاء"}
        destructive
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </>
  );
}
