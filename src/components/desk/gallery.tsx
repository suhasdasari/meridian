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
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-kicker text-subtle uppercase">Pictured</p>
          <h2 className="mt-1 font-display text-2xl font-medium text-fg">
            {countryName} · ten stories
          </h2>
        </div>
        <p className="font-mono text-xs text-subtle tabular-nums">{clusters.length}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {clusters.map((cluster, i) => (
          <li key={cluster.id} className={i === 0 ? "col-span-2 lg:col-span-2" : undefined}>
            <GalleryCard cluster={cluster} featured={i === 0} onOpen={onOpen} nowMs={nowMs} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function GalleryCard({
  cluster,
  featured,
  onOpen,
  nowMs,
}: {
  cluster: Cluster;
  featured: boolean;
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
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface text-left shadow-[var(--shadow-border)] transition-[box-shadow,filter] duration-200 ease-out hover:shadow-[var(--shadow-border-hover)] hover:brightness-110"
    >
      <div className={cn("h-0.5 w-full", BEAT_BAR[cluster.beat])} />
      <div className="relative aspect-video overflow-hidden bg-elevated">
        <p className="absolute inset-0 flex items-end p-3 font-display text-xl leading-tight text-subtle">
          {source}
        </p>
        <StoryImage
          src={cluster.imageUrl}
          alt=""
          className="absolute inset-0 size-full transition-transform duration-200 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent px-3 pt-10 pb-3 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
          <p className="line-clamp-4 text-sm leading-relaxed text-fg">{description}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 py-3">
        <BeatKicker beat={cluster.beat} />
        <p
          className={cn(
            "font-display font-medium leading-snug text-fg",
            featured ? "mt-1.5 text-xl md:text-2xl" : "mt-1.5 text-base",
          )}
        >
          {cluster.title}
        </p>
        <p className="mt-2 font-mono text-xs text-subtle">
          {source}
          <span> · {formatAge(cluster.publishedAt, nowMs)}</span>
        </p>
      </div>
    </button>
  );
}
