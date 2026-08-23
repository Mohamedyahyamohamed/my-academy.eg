"use client";

import { MobileNav } from "./mobile-nav";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";
import { LanguageToggle } from "./language-toggle";
import { PushNotifications } from "./push-notifications";
import { InstallApp } from "./install-app";
import { AcademySwitcher } from "./academy-switcher";
import type { SessionUser } from "@/types";
import type { NavSection } from "@/lib/nav";

interface TopbarProps {
  user: SessionUser;
  sections: NavSection[];
}

/** Top bar: mobile menu, global search, language toggle, notifications, user menu. */
export function Topbar({ user, sections }: TopbarProps) {
  return (
    <header className="print-shell-topbar sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <MobileNav sections={sections} />
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <AcademySwitcher currentAcademyId={user.academy_id} memberships={user.memberships} />
      <div className="flex items-center gap-1">
        <InstallApp />
        <PushNotifications />
        <LanguageToggle />
        <NotificationsMenu />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
