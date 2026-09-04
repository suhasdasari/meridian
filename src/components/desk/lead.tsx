"use client";

import { ArrowUpRight } from "lucide-react";
import type { Cluster } from "@/lib/news/types";
import { formatAge, uniqueNames } from "@/lib/news/format";
import { StoryImage } from "./story-image";

export function LeadStory({
  cluster,
  onOpen,
  nowMs,
}: {
  cluster: Cluster;
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  const sources = uniqueNames(
    cluster.articles.map((a) => a.source),
    10,
  );
  const coverage = cluster.regions.filter((r) => r !== "International");
  const hasImage = Boolean(cluster.imageUrl);

  return (
    <article className="enter">
      <button
        type="button"
        onClick={() => onOpen(cluster)}
        className="group w-full rounded-xl bg-surface p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)] md:p-4"
      >
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="font-mono text-xs tracking-kicker text-mark uppercase">
            {cluster.major ? "Major" : "Lead"}
            <span className="text-subtle"> · {cluster.sourceCount} independent outlets</span>
          </p>
          <p className="font-mono text-xs text-muted tabular-nums">{formatAge(cluster.publishedAt, nowMs)}</p>
        </div>
        <div
          className={
            hasImage
              ? "mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]"
              : "mt-3"
          }
        >
          {hasImage ? (
            <StoryImage
              src={cluster.imageUrl}
              alt=""
              className="aspect-video h-full max-h-80 w-full rounded-lg"
            />
          ) : null}
          <div className="flex flex-col justify-center px-1 pb-2">
            <h2 className="font-display text-3xl font-medium tracking-tight text-fg md:text-4xl">
              {cluster.title}
            </h2>
            {cluster.excerpt ? (
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{cluster.excerpt}</p>
            ) : null}
            <p className="mt-4 text-sm text-subtle">{sources}</p>
            {coverage.length > 0 ? (
              <p className="mt-2 font-mono text-xs tracking-wider text-subtle uppercase">
                Coverage · {coverage.join(" · ")}
              </p>
            ) : null}
            <span className="mt-5 inline-flex items-center gap-1 text-sm text-fg">
              Read across outlets
              <ArrowUpRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
