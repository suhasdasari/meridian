"use client";

import type { Article } from "@/lib/news/types";
import { formatStamp } from "@/lib/news/format";
import { cn } from "@/lib/utils";
import { articlePeek, usePeek, usePeekHandlers } from "./peek";

function WireRow({
  item,
  isNew,
  onOpen,
}: {
  item: Article;
  isNew: boolean;
  onOpen: (article: Article) => void;
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
        className={cn(
          "grid w-full grid-cols-[3.25rem_minmax(0,1fr)] gap-2 rounded-md px-3 py-2.5 text-left transition-colors duration-150 hover:bg-elevated",
          isNew && "bg-elevated/40",
        )}
      >
        <time dateTime={item.publishedAt} className="font-mono text-xs text-subtle tabular-nums">
          {formatStamp(item.publishedAt)}
        </time>
        <span className="min-w-0">
          <span className="block truncate text-sm text-fg">{item.title}</span>
          <span className="mt-0.5 block truncate font-mono text-xs text-subtle">
            {isNew ? "New · " : ""}
            {item.source}
          </span>
        </span>
      </button>
    </li>
  );
}

export function Wire({
  items,
  seen,
  onOpen,
}: {
  items: Article[];
  seen: Set<string>;
  onOpen: (article: Article) => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="live-dot size-1.5 rounded-full bg-mark" aria-hidden="true" />
          <h2 className="font-mono text-xs tracking-kicker text-muted uppercase">The wire</h2>
        </div>
        <p className="font-mono text-xs text-subtle tabular-nums">{items.length}</p>
      </header>
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {items.map((item) => (
          <WireRow key={item.id} item={item} isNew={!seen.has(item.id)} onOpen={onOpen} />
        ))}
      </ol>
    </section>
  );
}
