import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary ring-primary/20",
        secondary: "border-transparent bg-secondary text-secondary-foreground ring-border",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        warning:
          "border-transparent bg-amber-50 text-amber-700 ring-amber-600/20",
        destructive:
          "border-transparent bg-rose-50 text-rose-700 ring-rose-600/20",
        info: "border-transparent bg-sky-50 text-sky-700 ring-sky-600/20",
        outline: "text-foreground ring-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
