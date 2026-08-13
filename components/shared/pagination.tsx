"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pagination } from "@/types";

export function PaginationBar({ pagination }: { pagination: Pagination }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { page, pageSize, total, totalPages } = pagination;

  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" /> السابق
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
            const p = i + 1;
            return (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => go(p)}
              >
                {p}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
