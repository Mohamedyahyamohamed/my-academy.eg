"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users, UsersRound, BookOpen, Wallet, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/services/misc";
import { useClientLang } from "@/lib/i18n-client";

const iconFor = (type: SearchResult["type"]) =>
  type === "student"
    ? Users
    : type === "group"
      ? UsersRound
      : type === "lesson"
        ? BookOpen
        : Wallet;

export function GlobalSearch() {
  const router = useRouter();
  const lang = useClientLang();
  const en = lang === "en";
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!cancelled) {
        setResults(data.results ?? []);
        setOpen(true);
        setActive(0);
        setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (r?: SearchResult) => {
    const target = r ?? results[active];
    if (!target) return;
    router.push(target.href);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={en ? "Search students, groups, lessons…" : "ابحث عن طلاب، مجموعات، حصص…"}
        className="ps-9 pe-4"
        aria-label={en ? "Global search" : "بحث عام"}
      />
      {open && (query.trim().length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-elevated">
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {en ? "Searching…" : "جارٍ البحث…"}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {en ? `No results for “${query}”.` : `لا توجد نتائج لـ «${query}».`}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1">
              {results.map((r, i) => {
                const Icon = iconFor(r.type);
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => go(r)}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors",
                        active === i ? "bg-accent" : "hover:bg-accent/60",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        <span className="font-medium text-foreground">{r.label}</span>
                        <span className="ms-2 text-xs text-muted-foreground">
                          {r.subtitle}
                        </span>
                      </span>
                      {active === i && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
