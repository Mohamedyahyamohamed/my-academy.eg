import { cn } from "@/lib/utils";

/**
 * MY Academy brand mark — a graduation-cap-inspired geometric "M".
 */
export function Logo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const text =
    size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm",
          dim,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-1/2 w-1/2"
          aria-hidden="true"
        >
          {/* cap */}
          <path
            d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path
            d="M6 11v4.2c0 .5.27.96.7 1.2 1.4.78 3.27 1.6 5.3 1.6s3.9-.82 5.3-1.6c.43-.24.7-.7.7-1.2V11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M21.5 8.5v5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-semibold tracking-tight text-foreground", text)}>
            MY Academy
          </span>
        </div>
      )}
    </div>
  );
}
