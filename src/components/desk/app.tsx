"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDesk } from "@/lib/news/api";
import type { Article, Cluster, DeskPayload } from "@/lib/news/types";
import { COUNTRIES } from "@/lib/news/countries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Masthead } from "./masthead";
import { Wire } from "./wire";
import { DeskColumn } from "./column";
import { StoryPanel, clusterFromArticle } from "./story-panel";
import { articlePeek, PeekProvider, usePeek, usePeekHandlers } from "./peek";
import { CountryGallery } from "./gallery";
import { OneLiners } from "./liners";

const STORAGE_KEY = "meridian:desk";
const SEEN_KEY = "meridian:seen";

type Tab = "wire" | "liners" | "affairs" | "planet";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function DeskApp({ initial }: { initial: DeskPayload }) {
  return (
    <PeekProvider>
      <DeskInner initial={initial} />
    </PeekProvider>
  );
}

function DeskInner({ initial }: { initial: DeskPayload }) {
  const peek = usePeek();
  const [country, setCountry] = useState(initial.country);
  const [tab, setTab] = useState<Tab>("wire");
  const [open, setOpen] = useState<Cluster | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && COUNTRIES.some((c) => c.code === stored)) {
      setCountry(stored);
    }
    setSeen(loadSeen());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, country);
  }, [country, hydrated]);

  const query = useQuery({
    queryKey: ["desk", country],
    queryFn: () => getDesk({ data: { country } }),
    initialData: country === initial.country ? initial : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const data = query.data ?? initial;
  const nowMs = new Date(data.generatedAt).getTime();
  const isWorld = data.country === "WORLD";

  useEffect(() => {
    if (!query.data) return;
    const ids = [
      ...(query.data.lead?.articles.map((a) => a.id) ?? []),
      ...query.data.gallery.flatMap((c) => c.articles.map((a) => a.id)),
      ...query.data.wire.map((a) => a.id),
    ];
    const timer = window.setTimeout(() => {
      setSeen((prev) => {
        const merged = new Set(prev);
        for (const id of ids) merged.add(id);
        const trimmed = [...merged].slice(-800);
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
        return new Set(trimmed);
      });
    }, 90_000);
    return () => window.clearTimeout(timer);
  }, [query.data, query.dataUpdatedAt]);

  const ticker = useMemo(() => {
    const items = [
      ...data.gallery.map((c) => c.articles[0]).filter((a): a is Article => Boolean(a)),
      ...data.liners,
      ...data.wire,
    ].slice(0, 18);
    return [...items, ...items];
  }, [data.gallery, data.liners, data.wire]);

  function openCluster(cluster: Cluster) {
    peek.hideNow();
    setOpen(cluster);
  }

  function openArticle(article: Article) {
    peek.hideNow();
    const fromGallery = data.gallery.find((c) => c.articles.some((a) => a.id === article.id));
    if (fromGallery) {
      setOpen(fromGallery);
      return;
    }
    const fromLead = data.lead?.articles.some((a) => a.id === article.id);
    if (fromLead && data.lead) {
      setOpen(data.lead);
      return;
    }
    const fromCluster = [...data.affairs, ...data.planet].find((c) =>
      c.articles.some((a) => a.id === article.id),
    );
    setOpen(fromCluster ?? clusterFromArticle(article));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg md:h-dvh md:overflow-hidden">
      <Masthead
        country={country}
        onCountry={setCountry}
        sourceCount={data.sourceCount}
        fetching={query.isFetching}
        generatedAt={data.generatedAt}
      />

      {ticker.length > 0 ? (
        <div className="ticker shrink-0 overflow-hidden border-b border-border py-1.5">
          <div className="ticker-track flex w-max gap-8 whitespace-nowrap px-4 font-mono text-xs text-muted">
            {ticker.map((item, i) => (
              <TickerItem key={`${i}-${item.id}`} item={item} onOpen={openArticle} />
            ))}
          </div>
        </div>
      ) : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:overflow-hidden md:px-3">
        {query.isError && !query.data ? (
          <p className="rounded-lg bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
            The desk could not reach live feeds just now. Try again in a moment.
          </p>
        ) : null}

        {isWorld ? (
          <WorldDesk
            data={data}
            nowMs={nowMs}
            tab={tab}
            setTab={setTab}
            seen={seen}
            loading={query.isLoading}
            onOpenCluster={openCluster}
            onOpenArticle={openArticle}
          />
        ) : (
          <CountryDesk
            data={data}
            nowMs={nowMs}
            tab={tab}
            setTab={setTab}
            seen={seen}
            loading={query.isLoading}
            onOpenCluster={openCluster}
            onOpenArticle={openArticle}
          />
        )}
      </main>

      {open ? <StoryPanel cluster={open} onClose={() => setOpen(null)} nowMs={nowMs} /> : null}
    </div>
  );
}

function PicturedSlot({
  data,
  loading,
  onOpen,
  nowMs,
}: {
  data: DeskPayload;
  loading: boolean;
  onOpen: (cluster: Cluster) => void;
  nowMs: number;
}) {
  if (data.gallery.length > 0) {
    return (
      <CountryGallery
        clusters={data.gallery}
        countryName={data.countryName}
        onOpen={onOpen}
        nowMs={nowMs}
      />
    );
  }
  if (loading) {
    return (
      <div className="pictured-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <p className="flex h-full items-center rounded-lg bg-surface px-5 text-sm text-muted shadow-[var(--shadow-border)]">
      No pictured stories this cycle.
    </p>
  );
}

function WorldDesk({
  data,
  nowMs,
  tab,
  setTab,
  seen,
  loading,
  onOpenCluster,
  onOpenArticle,
}: {
  data: DeskPayload;
  nowMs: number;
  tab: Tab;
  setTab: (tab: Tab) => void;
  seen: Set<string>;
  loading: boolean;
  onOpenCluster: (cluster: Cluster) => void;
  onOpenArticle: (article: Article) => void;
}) {
  return (
    <div className="desk-world">
      <div className="min-h-0 [grid-area:pics]">
        <PicturedSlot data={data} loading={loading} onOpen={onOpenCluster} nowMs={nowMs} />
      </div>
      <div className="flex gap-1 [grid-area:tabs] lg:hidden">
        {(
          [
            ["wire", "Wire"],
            ["liners", "Brief"],
            ["affairs", "Affairs"],
            ["planet", "Planet"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1 rounded-md"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="min-h-0 [grid-area:panel] lg:hidden">
        {tab === "wire" ? <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} /> : null}
        {tab === "liners" ? (
          <OneLiners items={data.liners} onOpen={onOpenArticle} nowMs={nowMs} />
        ) : null}
        {tab === "affairs" ? (
          <DeskColumn
            kicker="Desk one"
            title="World affairs"
            clusters={data.affairs}
            onOpen={onOpenCluster}
            nowMs={nowMs}
          />
        ) : null}
        {tab === "planet" ? (
          <DeskColumn
            kicker="Desk two"
            title="Planet"
            clusters={data.planet}
            onOpen={onOpenCluster}
            nowMs={nowMs}
          />
        ) : null}
      </div>
      <div className="hidden min-h-0 [grid-area:wire] lg:block">
        <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
      </div>
      <div className="hidden min-h-0 [grid-area:liners] lg:block">
        <OneLiners items={data.liners} onOpen={onOpenArticle} nowMs={nowMs} />
      </div>
      <div className="hidden min-h-0 [grid-area:affairs] lg:block">
        <DeskColumn
          kicker="Desk one"
          title="World affairs"
          clusters={data.affairs}
          onOpen={onOpenCluster}
          nowMs={nowMs}
        />
      </div>
      <div className="hidden min-h-0 [grid-area:planet] lg:block">
        <DeskColumn
          kicker="Desk two"
          title="Planet"
          clusters={data.planet}
          onOpen={onOpenCluster}
          nowMs={nowMs}
        />
      </div>
    </div>
  );
}

function CountryDesk({
  data,
  nowMs,
  tab,
  setTab,
  seen,
  loading,
  onOpenCluster,
  onOpenArticle,
}: {
  data: DeskPayload;
  nowMs: number;
  tab: Tab;
  setTab: (tab: Tab) => void;
  seen: Set<string>;
  loading: boolean;
  onOpenCluster: (cluster: Cluster) => void;
  onOpenArticle: (article: Article) => void;
}) {
  return (
    <div className="desk-country">
      <div className="min-h-0 [grid-area:pics]">
        <PicturedSlot data={data} loading={loading} onOpen={onOpenCluster} nowMs={nowMs} />
      </div>
      <div className="flex gap-1 [grid-area:tabs] lg:hidden">
        {(
          [
            ["wire", "Wire"],
            ["liners", "Brief"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1 rounded-md"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="min-h-0 [grid-area:panel] lg:hidden">
        {tab === "liners" ? (
          <OneLiners items={data.liners} onOpen={onOpenArticle} nowMs={nowMs} />
        ) : (
          <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
        )}
      </div>
      <div className="hidden min-h-0 [grid-area:wire] lg:block">
        <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
      </div>
      <div className="hidden min-h-0 [grid-area:liners] lg:block">
        <OneLiners items={data.liners} onOpen={onOpenArticle} nowMs={nowMs} />
      </div>
    </div>
  );
}

function TickerItem({
  item,
  onOpen,
}: {
  item: Article;
  onOpen: (article: Article) => void;
}) {
  const peek = usePeek();
  const handlers = usePeekHandlers(articlePeek(item));
  return (
    <button
      type="button"
      {...handlers}
      onClick={() => {
        peek.hideNow();
        onOpen(item);
      }}
      className="whitespace-nowrap bg-transparent p-0 text-left hover:text-fg"
    >
      {item.title}
    </button>
  );
}
