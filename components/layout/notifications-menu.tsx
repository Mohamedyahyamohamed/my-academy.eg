"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelative } from "@/lib/utils";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import type { AppNotification } from "@/types";
import { useClientLang } from "@/lib/i18n-client";
import { toast } from "sonner";

const dotColor: Record<AppNotification["type"], string> = {
  payment_overdue: "bg-rose-500",
  payment_received: "bg-emerald-500",
  homework_assigned: "bg-sky-500",
  homework_reviewed: "bg-violet-500",
  homework_deadline: "bg-amber-500",
  new_grade: "bg-violet-500",
  upcoming_lesson: "bg-indigo-500",
  attendance: "bg-teal-500",
  absence_repeat: "bg-orange-500",
  low_grade: "bg-red-500",
  system: "bg-slate-400",
};

export function NotificationsMenu() {
  const lang = useClientLang();
  const en = lang === "en";
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setItems(await getNotificationsAction());
    } catch (error) {
      console.error("notifications load failed:", error);
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 20_000); // keep unread count fresh
    return () => clearInterval(t);
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={en ? "Notifications" : "الإشعارات"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-semibold">{en ? "Notifications" : "الإشعارات"}</span>
          {unread > 0 && (
            <button
              onClick={async () => {
                try {
                  await markAllNotificationsReadAction();
                  await load();
                } catch (error) {
                  console.error("mark all notifications read failed:", error);
                  toast.error(en ? "Could not update notifications." : "تعذر تحديث الإشعارات.");
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> {en ? "Mark all as read" : "تعليم الكل كمقروء"}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {en ? "You&apos;re all caught up." : "لا توجد إشعارات جديدة."}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.slice(0, 12).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex items-start gap-2.5 px-3 py-2.5"
                onClick={async () => {
                  try {
                    await markNotificationReadAction(n.id);
                    await load();
                  } catch (error) {
                    console.error("mark notification read failed:", error);
                    toast.error(en ? "Could not update the notification." : "تعذر تحديث الإشعار.");
                  }
                }}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    dotColor[n.type],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !n.read && "font-semibold",
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatRelative(n.created_at, en ? "en-EG" : "ar-EG")}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
