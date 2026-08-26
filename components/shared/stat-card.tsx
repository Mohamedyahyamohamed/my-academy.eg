import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: number; positive?: boolean; label?: string };
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
  href?: string;
}

const accentMap = {
  primary: "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  destructive: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  accent = "primary",
  href,
}: StatCardProps) {
  const content = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-[1.03]">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={cn("inline-flex items-center gap-0.5 font-medium", trend.positive ? "text-emerald-600" : "text-rose-600")}>
                {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
            </div>
          )}
          {hint && !trend && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  );

  const glowMap: Record<string, string> = {
    primary: "shadow-[0_12px_36px_-14px_rgb(8_127_145/0.45)]",
    success: "shadow-[0_12px_36px_-14px_rgb(16_185_129/0.4)]",
    warning: "shadow-[0_12px_36px_-14px_rgb(245_158_11/0.4)]",
    info: "shadow-[0_12px_36px_-14px_rgb(56_189_248/0.45)]",
    destructive: "shadow-[0_12px_36px_-14px_rgb(244_63_94/0.4)]",
  };

  const card = (
    <Card className={cn("group overflow-hidden rounded-2xl border-border/60 bg-gradient-to-b from-card to-muted/25 transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg", glowMap[accent])}>
      {content}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={label}>
      {card}
    </Link>
  ) : card;
}
