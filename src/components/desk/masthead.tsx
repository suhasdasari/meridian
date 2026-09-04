"use client";

import { findCountry } from "@/lib/news/countries";
import { CountrySelect } from "./country-select";
import { LiveClock } from "./clock";
import { BeatLegend } from "./beat";

export function Masthead({
  country,
  onCountry,
  sourceCount,
  fetching,
  generatedAt,
}: {
  country: string;
  onCountry: (code: string) => void;
  sourceCount: number;
  fetching: boolean;
  generatedAt: string;
}) {
  const edition = findCountry(country);
  const isWorld = edition.code === "WORLD";

  return (
    <header className="shrink-0 border-b border-rule">
      <div className="flex h-12 items-center gap-3 px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="font-display text-xl font-medium tracking-tight text-fg md:text-2xl">Meridian</h1>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs tracking-kicker text-muted uppercase">
            <span className="live-dot size-1.5 rounded-full bg-mark" aria-hidden="true" />
            {fetching ? "Updating" : "Live"}
          </span>
          <p className="hidden truncate font-mono text-xs tracking-wider text-subtle uppercase lg:block">
            {isWorld ? "World" : edition.name}
            {sourceCount > 0 ? ` · ${sourceCount} outlets` : ""}
          </p>
        </div>
        <div className="ml-auto hidden md:block">
          <BeatLegend />
        </div>
        <CountrySelect value={country} onChange={onCountry} />
        <LiveClock initialIso={generatedAt} />
      </div>
    </header>
  );
}
