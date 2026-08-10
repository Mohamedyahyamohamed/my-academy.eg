"use server";
import { audit } from "@/services/audit";

import {
  getCurrentUser,
  NotificationsService,
} from "@/services";
import type { AppNotification } from "@/types";

export async function getNotificationsAction(): Promise<AppNotification[]> {
  const user = getCurrentUser();
  if (!user) return [];
  return NotificationsService.listNotifications(user.id);
}

export async function markNotificationReadAction(id: string) {
  const user = getCurrentUser();
  if (!user) return;
  NotificationsService.markRead(id);
  void audit({ action: "notification.read" });
}

export async function markAllNotificationsReadAction() {
  const user = getCurrentUser();
  if (!user) return;
  NotificationsService.markAllRead(user.id);
}

// Audit all actions in this file.
