"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Toolbar with a search box that syncs to URL search params.
 * Use <Toolbar.Root>, <Toolbar.Search>, <Toolbar.Select>, <Toolbar.Actions>.
 */
const Root = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
    {children}
  </div>
);

function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get("search") ?? "");
  const first = React.useRef(true);

  React.useEffect(() => {
    setValue(params.get("search") ?? "");
  }, [params]);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("search", value);
      else next.delete("search");
      next.delete("page");
      router.replace(`${pathname}?${next.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  paramKey,
  options,
  label,
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(paramKey) ?? "ALL";
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value === "ALL") next.delete(paramKey);
        else next.set(paramKey, e.target.value);
        next.delete("page");
        router.replace(`${pathname}?${next.toString()}`);
      }}
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 sm:ml-auto">{children}</div>;
}

export { Root as ToolbarRoot, SearchInput as ToolbarSearch, FilterSelect as ToolbarSelect, Actions as ToolbarActions };
