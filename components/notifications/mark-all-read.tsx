"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { toast } from "sonner";

export function MarkAllReadButton({ en = false }: { en?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await markAllNotificationsReadAction();
          router.refresh();
        } catch (error) {
          console.error("mark all notifications read failed:", error);
          toast.error(en ? "Could not update notifications." : "تعذر تحديث الإشعارات.");
        }
      }}
    >
      <CheckCheck className="h-4 w-4" /> {en ? "Mark all as read" : "تعليم الكل كمقروء"}
    </Button>
  );
}
