"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type LandingFaqItem = readonly [question: string, answer: string];

export function LandingFaq({ items, headingId = "faq-heading" }: { items: readonly LandingFaqItem[]; headingId?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-10 space-y-3" aria-labelledby={headingId}>
      {items.map(([question, answer], index) => {
        const open = openIndex === index;
        const panelId = `landing-faq-panel-${index}`;
        const triggerId = `landing-faq-trigger-${index}`;
        return (
          <div key={question} className="overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/25">
            <button
              id={triggerId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-4 p-5 text-start font-bold outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span>{question}</span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-lg transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              aria-hidden={!open}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
