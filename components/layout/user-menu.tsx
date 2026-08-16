"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/shared/badges";
import { initials } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";
import type { SessionUser } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const lang = useClientLang();
  const en = lang === "en";
  const canManageAcademy = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const dashboardPath = user.role === "TEACHER"
    ? "/teacher"
    : user.role === "PARENT"
      ? "/parent"
      : user.role === "STUDENT"
        ? "/student"
        : "/dashboard";
  const goToDashboard = () => {
    router.push(dashboardPath);
    router.refresh();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:pr-3">
          <Avatar>
            <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
          </Avatar>
          <span
            className="hidden cursor-pointer text-sm font-medium underline-offset-4 hover:underline sm:inline"
            role="link"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              goToDashboard();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                goToDashboard();
              }
            }}
            aria-label={en ? "Go to dashboard" : "العودة إلى لوحة التحكم"}
          >
            {user.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {user.full_name}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
            <RoleBadge role={user.role} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canManageAcademy && (
          <>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4" /> {en ? "Settings" : "الإعدادات"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={async () => {
            await logoutAction();
            toast.success(en ? "Signed out successfully." : "تم تسجيل الخروج.");
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" /> {en ? "Sign out" : "تسجيل الخروج"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
