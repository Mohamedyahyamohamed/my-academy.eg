"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export function MarkAllReadButton({ en = false }: { en?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await markAllNotificationsReadAction();
        router.refresh();
      }}
    >
      <CheckCheck className="h-4 w-4" /> {en ? "Mark all as read" : "تعليم الكل كمقروء"}
    </Button>
  );
}
