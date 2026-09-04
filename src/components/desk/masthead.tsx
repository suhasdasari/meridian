"use client";

import { findCountry } from "@/lib/news/countries";
import { CountrySelect } from "./country-select";
import { LiveClock } from "./clock";

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
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-4 md:block">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-medium tracking-tight text-fg md:text-4xl">
                Meridian
              </h1>
              <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs tracking-kicker text-muted uppercase">
                <span className="live-dot size-1.5 rounded-full bg-mark" aria-hidden="true" />
                {fetching ? "Updating" : "Live"}
              </span>
            </div>
            <p className="mt-1 max-w-md text-sm text-muted">
              {isWorld
                ? "The world desk. Headlines as published. No editorial ranking."
                : `${edition.name} desk. Local headlines as published. No editorial ranking.`}
            </p>
          </div>
          <div className="md:hidden">
            <LiveClock initialIso={generatedAt} />
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <CountrySelect value={country} onChange={onCountry} />
          <div className="hidden md:block">
            <LiveClock initialIso={generatedAt} />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center px-4 pb-3 font-mono text-xs tracking-wider text-subtle uppercase md:px-6">
        <p>
          {isWorld ? "World edition" : `${edition.name} desk`}
          {sourceCount > 0 ? ` · ${sourceCount} outlets this cycle` : ""}
        </p>
      </div>
    </header>
  );
}