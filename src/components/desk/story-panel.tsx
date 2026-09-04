"use client";

import { ArrowUpRight, X } from "lucide-react";
import type { Article, Cluster } from "@/lib/news/types";
import { formatAge, uniqueNames } from "@/lib/news/format";
import { Button } from "@/components/ui/button";
import { StoryImage } from "./story-image";

export function StoryPanel({
  cluster,
  onClose,
  nowMs,
}: {
  cluster: Cluster;
  onClose: () => void;
  nowMs: number;
}) {
  const primary = cluster.articles[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close story"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-[var(--shadow-border)]">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs tracking-kicker text-mark uppercase">
              {cluster.major ? "Major" : "Story"}
              <span className="text-subtle"> · {cluster.sourceCount} outlets</span>
            </p>
            <p className="mt-1 font-mono text-xs text-muted">{formatAge(cluster.publishedAt, nowMs)}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {cluster.imageUrl ? (
            <StoryImage src={cluster.imageUrl} alt="" className="mb-5 aspect-video w-full rounded-lg" />
          ) : null}
          <h2 className="font-display text-2xl font-medium tracking-tight text-fg">{cluster.title}</h2>
          {cluster.excerpt ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.excerpt}</p>
          ) : null}
          <p className="mt-3 text-sm text-subtle">
            {uniqueNames(
              cluster.articles.map((a) => a.source),
              12,
            )}
          </p>
          {cluster.regions.length > 0 ? (
            <p className="mt-2 font-mono text-xs tracking-wider text-subtle uppercase">
              Coverage · {cluster.regions.join(" · ")}
            </p>
          ) : null}

          <h3 className="mt-8 font-mono text-xs tracking-kicker text-subtle uppercase">
            As published
          </h3>
          <p className="mt-1 mb-3 text-xs text-subtle">
            Each line is the outlet’s own headline. Meridian does not rewrite copy.
          </p>
          <ul className="divide-y divide-border">
            {cluster.articles.map((article) => (
              <li key={article.id}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-3 py-3"
                >
                  <span>
                    <span className="block text-sm leading-snug text-fg">{article.title}</span>
                    <span className="mt-1 block font-mono text-xs text-subtle">
                      {article.source} · {formatAge(article.publishedAt, nowMs)}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {primary ? (
          <footer className="border-t border-border p-4">
            <Button asChild className="h-11 w-full rounded-lg">
              <a href={primary.url} target="_blank" rel="noopener noreferrer">
                Open original
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export function clusterFromArticle(article: Article): Cluster {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    publishedAt: article.publishedAt,
    articles: [article],
    sourceCount: 1,
    regions: [article.region],
    desk: article.desk,
    major: false,
  };
}
