"use client";

import * as React from "react";

/** Registers the PWA service worker without blocking rendering or authentication. */
export function PwaRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // Explicitly check for a new worker on every app visit so installed
        // PWAs do not keep an outdated scanner bundle after a deployment.
        await registration.update();
      } catch (error) {
        // PWA support must never make the main application fail to render.
        console.warn("MYAcademy service worker registration failed", error);
      }
    })();
  }, []);

  return null;
}
