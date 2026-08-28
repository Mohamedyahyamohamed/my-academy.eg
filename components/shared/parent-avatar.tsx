import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials, colorFromString } from "@/lib/utils";
import { fullName } from "@/services/_shared";
import type { Parent } from "@/types";

interface ParentAvatarProps {
  parent: Parent;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ParentAvatar({ parent, className, size = "md" }: ParentAvatarProps) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const text =
    size === "sm" ? "text-[11px]" : size === "lg" ? "text-base" : "text-xs";
  const bg = colorFromString(fullName(parent));
  return (
    <Avatar className={cn(dim, className)}>
      <AvatarFallback className={cn(bg, "text-white", text)}>
        {initials(fullName(parent))}
      </AvatarFallback>
    </Avatar>
  );
}
