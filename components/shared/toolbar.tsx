"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useClientLang } from "@/lib/i18n-client";

/**
 * Toolbar with a search box that syncs to URL search params.
 * Use <Toolbar.Root>, <Toolbar.Search>, <Toolbar.Select>, <Toolbar.Actions>.
 */
const Root = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
    {children}
  </div>
);

function SearchInput({ placeholder }: { placeholder?: string }) {
  const lang = useClientLang();
  const en = lang === "en";
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
      <Search className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", en ? "right-3" : "left-3")} />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? (en ? "Search…" : "بحث…")}
        className={en ? "pr-9" : "pl-9"}
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", en ? "left-2.5" : "right-2.5")}
          aria-label={en ? "Clear search" : "مسح البحث"}
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
  defaultValue = "ALL",
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  label: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(paramKey) ?? defaultValue;
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value === defaultValue) next.delete(paramKey);
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
  const en = useClientLang() === "en";
  return <div className={cn("flex items-center gap-2", en ? "sm:ml-auto" : "sm:mr-auto")}>{children}</div>;
}

export { Root as ToolbarRoot, SearchInput as ToolbarSearch, FilterSelect as ToolbarSelect, Actions as ToolbarActions };
