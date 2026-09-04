"use client";

import type { Cluster } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";
import { cn } from "@/lib/utils";
import { StoryImage } from "./story-image";
import { BeatKicker, BEAT_BAR } from "./beat";

export function CountryGallery({
  clusters,
  countryName,
  onOpen,
  nowMs,
}: {
  clusters: Cluster[];
  countryName: string;
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  return (
    <section className="flex min-h-0 flex-col md:h-full">
      <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-medium text-fg md:text-base">
          <span className="font-mono text-xs tracking-kicker text-subtle uppercase">Pictured · </span>
          {countryName} · ten
        </h2>
        <p className="font-mono text-xs text-subtle tabular-nums">{clusters.length}</p>
      </div>
      <ul className="pictured-grid md:min-h-0 md:flex-1">
        {clusters.map((cluster) => (
          <li key={cluster.id} className="min-h-0">
            <GalleryCard cluster={cluster} onOpen={onOpen} nowMs={nowMs} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function GalleryCard({
  cluster,
  onOpen,
  nowMs,
}: {
  cluster: Cluster;
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  const source =
    cluster.sourceCount > 1
      ? `${cluster.sourceCount} outlets`
      : (cluster.articles[0]?.source ?? "");
  const description =
    cluster.excerpt ||
    cluster.articles.find((a) => a.excerpt)?.excerpt ||
    `${source}. ${cluster.title}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(cluster)}
      className="gallery-card group relative flex w-full flex-col overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-border)] transition-[box-shadow,filter] duration-200 ease-out hover:shadow-[var(--shadow-border-hover)] hover:brightness-110"
    >
      <span className={cn("absolute inset-x-0 top-0 z-10 h-0.5", BEAT_BAR[cluster.beat])} />
      <div className="gallery-photo overflow-hidden bg-elevated">
        <p className="absolute inset-0 flex items-end p-3 font-display text-lg leading-tight text-subtle">
          {source}
        </p>
        <StoryImage
          src={cluster.imageUrl}
          alt=""
          className="absolute inset-0 size-full transition-transform duration-200 ease-out group-hover:scale-105"
        />
        <div className="gallery-hover absolute inset-0 z-20 bg-bg/90 px-3 py-3 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 max-md:hidden">
          <p className="line-clamp-6 text-sm leading-relaxed text-fg">{description}</p>
        </div>
      </div>
      <div className="gallery-caption">
        <BeatKicker beat={cluster.beat} />
        <p className="mt-1 font-display text-base font-medium leading-snug text-fg md:line-clamp-2 md:text-sm">
          {cluster.title}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-subtle">
          {source}
          <span> · {formatAge(cluster.publishedAt, nowMs)}</span>
        </p>
      </div>
    </button>
  );
}
