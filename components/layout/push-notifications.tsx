"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PUBLIC_VAPID_KEY =
  "BFD5Yemjsjd3BMejcru_eiNpsuIHQ87tdisS1AYuYqDJlqytE8EGlIMy9rHB3O27-U1nQ2ncEXoXOP3SVhdTbgI";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotifications() {
  const [status, setStatus] = React.useState<"unsupported" | "default" | "granted" | "denied">("default");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    // سجّل service worker
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "granted" : Notification.permission);
    });
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setStatus("granted");
    } catch (e) {
      console.error("push subscribe error:", e);
      setStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setStatus("default");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unsupported") return null;

  if (status === "granted") {
    return (
      <Button variant="ghost" size="sm" onClick={unsubscribe} disabled={loading} title="إيقاف الإشعارات">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4 text-emerald-500" />}
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={subscribe} disabled={loading} title="فعّل الإشعارات">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
    </Button>
  );
}
