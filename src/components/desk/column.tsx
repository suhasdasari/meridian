"use client";

import type { Cluster } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";
import { clusterPeek, usePeek, usePeekHandlers } from "./peek";
import { BeatKicker } from "./beat";

function ColumnRow({
  cluster,
  onOpen,
  nowMs,
}: {
  cluster: Cluster;
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  const peek = usePeek();
  const handlers = usePeekHandlers(clusterPeek(cluster));
  return (
    <li>
      <button
        type="button"
        {...handlers}
        onClick={() => {
          peek.hideNow();
          onOpen(cluster);
        }}
        className="w-full py-2 text-left transition-opacity duration-150 hover:opacity-80"
      >
        <BeatKicker beat={cluster.beat} className="mb-0.5" />
        <p className="line-clamp-2 font-display text-sm font-medium leading-snug text-fg">{cluster.title}</p>
        <p className="mt-1 font-mono text-xs text-subtle">
          {cluster.sourceCount > 1
            ? `${cluster.sourceCount} outlets`
            : cluster.articles[0]?.source}
          <span className="text-subtle"> · {formatAge(cluster.publishedAt, nowMs)}</span>
        </p>
      </button>
    </li>
  );
}

export function DeskColumn({
  kicker,
  title,
  clusters,
  onOpen,
  nowMs,
}: {
  kicker: string;
  title: string;
  clusters: Cluster[];
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h2 className="font-mono text-xs tracking-kicker text-muted uppercase">{title}</h2>
        <p className="font-mono text-xs text-subtle tabular-nums">{clusters.length}</p>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
        {clusters.map((cluster) => (
          <ColumnRow key={cluster.id} cluster={cluster} onOpen={onOpen} nowMs={nowMs} />
        ))}
      </ul>
    </section>
  );
}
