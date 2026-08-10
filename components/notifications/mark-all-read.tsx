"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export function MarkAllReadButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await markAllNotificationsReadAction();
        router.refresh();
      }}
    >
      <CheckCheck className="h-4 w-4" /> Mark all read
    </Button>
  );
}
