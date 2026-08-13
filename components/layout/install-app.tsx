"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "ma_install_prompt_dismissed";

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY) !== "true") setDeferredPrompt(event as DeferredInstallPrompt);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed || !deferredPrompt) return null;

  return (
    <div className="hidden items-center gap-1 sm:flex" aria-label="تثبيت تطبيق MY Academy">
      <Button variant="ghost" size="sm" onClick={install} title="تثبيت التطبيق">
        <Download className="h-4 w-4" />
        <span className="sr-only">تثبيت التطبيق</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "true");
          setDeferredPrompt(null);
        }}
        title="إخفاء اقتراح التثبيت"
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">إخفاء</span>
      </Button>
    </div>
  );
}
