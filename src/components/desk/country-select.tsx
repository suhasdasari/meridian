"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Globe2, Search } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/news/countries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0]!;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.region.toLowerCase().includes(query),
    );
  }, [q]);

  const groups = useMemo(() => {
    const map = new Map<string, Country[]>();
    for (const c of filtered) {
      const list = map.get(c.region) ?? [];
      list.push(c);
      map.set(c.region, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className={cn("relative", open && "z-50")}>
      <Button
        type="button"
        variant="outline"
        className="h-11 min-w-44 justify-between rounded-lg px-3.5 font-medium"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Globe2 className="size-4 text-muted" strokeWidth={1.75} />
          <span>{selected.name}</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted transition-transform duration-150", open && "rotate-180")} />
      </Button>
      {open ? (
        <div
          className="absolute top-full left-0 z-40 mt-2 w-80 max-w-full overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)] md:left-auto md:right-0"
          role="listbox"
        >
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a desk"
                aria-label="Search country desk"
                className="pl-9"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {[...groups.entries()].map(([region, list]) => (
              <div key={region} className="mb-2">
                <p className="px-2 pt-2 pb-1 font-mono text-xs tracking-wider text-subtle uppercase">
                  {region}
                </p>
                {list.map((c) => {
                  const active = c.code === value;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm transition-colors duration-150",
                        active ? "bg-elevated text-fg" : "text-fg hover:bg-elevated/70",
                      )}
                      onClick={() => {
                        onChange(c.code);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span>{c.name}</span>
                      {active ? <Check className="size-4 text-muted" /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">No matching desk.</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {open ? (
        <button
          type="button"
          aria-label="Close desk picker"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
