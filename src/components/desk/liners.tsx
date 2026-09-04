"use client";

import type { Article } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";
import { articlePeek, usePeek, usePeekHandlers } from "./peek";

export function OneLiners({
  items,
  onOpen,
  nowMs,
}: {
  items: Article[];
  onOpen: (article: Article) => void;
  nowMs: number;
}) {
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5">
      <p className="font-mono text-xs tracking-kicker text-subtle uppercase">In brief</p>
      <h2 className="mt-1 font-display text-2xl font-medium text-fg">One line</h2>
      <ol className="mt-4 divide-y divide-border">
        {items.map((item, i) => (
          <LinerRow key={item.id} item={item} index={i + 1} onOpen={onOpen} nowMs={nowMs} />
        ))}
      </ol>
    </section>
  );
}

function LinerRow({
  item,
  index,
  onOpen,
  nowMs,
}: {
  item: Article;
  index: number;
  onOpen: (article: Article) => void;
  nowMs: number;
}) {
  const peek = usePeek();
  const handlers = usePeekHandlers(articlePeek(item));
  return (
    <li>
      <button
        type="button"
        {...handlers}
        onClick={() => {
          peek.hideNow();
          onOpen(item);
        }}
        className="-mx-2 grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md px-2 py-3 text-left transition-colors duration-150 hover:bg-elevated"
      >
        <span className="font-mono text-xs text-subtle tabular-nums">{String(index).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-fg">{item.title}</span>
          <span className="mt-0.5 block truncate font-mono text-xs text-subtle">
            {item.source} · {formatAge(item.publishedAt, nowMs)}
          </span>
        </span>
      </button>
    </li>
  );
}
