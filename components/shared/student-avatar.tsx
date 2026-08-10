import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials, colorFromString } from "@/lib/utils";

interface StudentAvatarProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StudentAvatar({ name, className, size = "md" }: StudentAvatarProps) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const text =
    size === "sm" ? "text-[11px]" : size === "lg" ? "text-base" : "text-xs";
  const bg = colorFromString(name);
  return (
    <Avatar className={cn(dim, className)}>
      <AvatarFallback
        className={cn(bg, "text-white", text)}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
