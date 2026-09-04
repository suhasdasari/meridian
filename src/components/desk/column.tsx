"use client";

import type { Cluster } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";

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
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5">
      <p className="font-mono text-xs tracking-kicker text-subtle uppercase">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-medium text-fg">{title}</h2>
      <ul className="mt-4 divide-y divide-border">
        {clusters.map((cluster) => (
          <li key={cluster.id}>
            <button
              type="button"
              onClick={() => onOpen(cluster)}
              className="w-full py-3.5 text-left transition-opacity duration-150 hover:opacity-80"
            >
              <p className="font-display text-lg font-medium leading-snug text-fg">{cluster.title}</p>
              <p className="mt-1.5 font-mono text-xs text-subtle">
                {cluster.sourceCount > 1
                  ? `${cluster.sourceCount} outlets`
                  : cluster.articles[0]?.source}
                <span className="text-subtle"> · {formatAge(cluster.publishedAt, nowMs)}</span>
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
