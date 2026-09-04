"use client";

import type { Article } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";
import { articlePeek, usePeek, usePeekHandlers } from "./peek";
import { BeatKicker, BeatRail } from "./beat";

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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h2 className="font-mono text-xs tracking-kicker text-muted uppercase">One line</h2>
        <p className="font-mono text-xs text-subtle tabular-nums">{items.length}</p>
      </header>
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
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
        className="grid w-full grid-cols-[0.5rem_1.5rem_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-elevated"
      >
        <BeatRail beat={item.beat} />
        <span className="font-mono text-xs text-subtle tabular-nums">{String(index).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-fg">{item.title}</span>
          <span className="mt-0.5 flex items-center gap-2 truncate font-mono text-xs text-subtle">
            <BeatKicker beat={item.beat} />
            <span>
              {item.source} · {formatAge(item.publishedAt, nowMs)}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
