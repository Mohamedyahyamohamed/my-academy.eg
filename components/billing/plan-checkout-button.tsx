"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startBillingCheckoutAction } from "@/app/actions/billing";

type Props = {
  planId: string;
  isCurrent: boolean;
  isFree: boolean;
};

export function PlanCheckoutButton({ planId, isCurrent, isFree }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isCurrent) {
    return <Button className="mt-4 w-full" variant="outline" disabled>الخطة الحالية</Button>;
  }

  if (isFree) {
    return <Button className="mt-4 w-full" variant="outline" disabled>تواصل معنا للرجوع للخطة المجانية</Button>;
  }

  const startCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await startBillingCheckoutAction(planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  };

  return (
    <div className="mt-4 space-y-2">
      <Button className="w-full" onClick={startCheckout} disabled={pending}>
        {pending ? <><Loader2 className="ms-2 h-4 w-4 animate-spin" />جارٍ تجهيز الدفع…</> : "اختيار الخطة"}
      </Button>
      {error && <p className="text-center text-xs leading-5 text-destructive" role="alert">{error}</p>}
    </div>
  );
}
