"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDesk } from "@/lib/news/api";
import type { Article, Cluster, DeskPayload } from "@/lib/news/types";
import { COUNTRIES } from "@/lib/news/countries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Masthead } from "./masthead";
import { LeadStory } from "./lead";
import { Wire } from "./wire";
import { DeskColumn } from "./column";
import { StoryPanel, clusterFromArticle } from "./story-panel";
import { articlePeek, PeekProvider, usePeek, usePeekHandlers } from "./peek";
import { CountryGallery } from "./gallery";
import { OneLiners } from "./liners";

const STORAGE_KEY = "meridian:desk";
const SEEN_KEY = "meridian:seen";

type Tab = "wire" | "affairs" | "planet";

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
    const items = isWorld
      ? data.wire.slice(0, 18)
      : [
          ...data.gallery.map((c) => c.articles[0]).filter((a): a is Article => Boolean(a)),
          ...data.liners,
          ...data.wire,
        ].slice(0, 18);
    return [...items, ...items];
  }, [data.gallery, data.liners, data.wire, isWorld]);

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
    <div className="min-h-dvh bg-bg text-fg">
      <Masthead
        country={country}
        onCountry={setCountry}
        sourceCount={data.sourceCount}
        fetching={query.isFetching}
        generatedAt={data.generatedAt}
      />

      {ticker.length > 0 ? (
        <div className="ticker overflow-hidden border-b border-border py-2">
          <div className="ticker-track flex w-max gap-8 whitespace-nowrap px-4 font-mono text-xs text-muted">
            {ticker.map((item, i) => (
              <TickerItem key={`${i}-${item.id}`} item={item} onOpen={openArticle} />
            ))}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        {query.isError && !query.data ? (
          <p className="rounded-xl bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
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
            seen={seen}
            loading={query.isLoading}
            onOpenCluster={openCluster}
            onOpenArticle={openArticle}
          />
        )}

        <footer className="mt-10 max-w-3xl pb-10 text-sm leading-relaxed text-subtle">
          <p>
            {isWorld
              ? "Meridian does not editorialize, score sentiment, or rewrite headlines. The lead is the cluster with the most independent outlets in this cycle, weighted only by recency and geographic spread of coverage. World affairs and planet desks appear only on the world edition."
              : `This is the ${data.countryName} desk. World affairs and planet run only on the world edition. Headlines are as published. The pictured ten are the most-covered local stories this cycle; one-liners and the wire carry the rest.`}
          </p>
        </footer>
      </main>

      {open ? <StoryPanel cluster={open} onClose={() => setOpen(null)} nowMs={nowMs} /> : null}
    </div>
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
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)] lg:items-stretch">
        <div>
          {data.lead ? (
            <LeadStory cluster={data.lead} onOpen={onOpenCluster} nowMs={nowMs} />
          ) : loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <div className="rounded-xl bg-surface px-5 py-10 shadow-[var(--shadow-border)]">
              <p className="font-mono text-xs tracking-kicker text-subtle uppercase">Lead</p>
              <p className="mt-2 font-display text-2xl text-fg">No clustered lead this cycle.</p>
            </div>
          )}
        </div>
        <div className="hidden h-96 lg:block">
          <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
        </div>
      </div>

      <div className="mt-4 flex gap-2 lg:hidden">
        {(
          [
            ["wire", "Wire"],
            ["affairs", "World affairs"],
            ["planet", "Planet"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "default" : "outline"}
            size="sm"
            className="h-11 flex-1 rounded-lg"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-4 lg:hidden">
        {tab === "wire" ? (
          <div className="h-96">
            <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
          </div>
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

      <div className="mt-4 hidden grid-cols-2 gap-4 lg:grid">
        <DeskColumn
          kicker="Desk one"
          title="World affairs"
          clusters={data.affairs}
          onOpen={onOpenCluster}
          nowMs={nowMs}
        />
        <DeskColumn
          kicker="Desk two"
          title="Planet"
          clusters={data.planet}
          onOpen={onOpenCluster}
          nowMs={nowMs}
        />
      </div>
    </>
  );
}

function CountryDesk({
  data,
  nowMs,
  seen,
  loading,
  onOpenCluster,
  onOpenArticle,
}: {
  data: DeskPayload;
  nowMs: number;
  seen: Set<string>;
  loading: boolean;
  onOpenCluster: (cluster: Cluster) => void;
  onOpenArticle: (article: Article) => void;
}) {
  return (
    <>
      {data.gallery.length > 0 ? (
        <CountryGallery
          clusters={data.gallery}
          countryName={data.countryName}
          onOpen={onOpenCluster}
          nowMs={nowMs}
        />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
          No pictured stories for this desk yet. The wire below still lists what arrived.
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)]">
        {data.liners.length > 0 ? (
          <OneLiners items={data.liners} onOpen={onOpenArticle} nowMs={nowMs} />
        ) : (
          <div className="rounded-xl bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
            One-liners will fill as local copy arrives.
          </div>
        )}
        <div className="min-h-96">
          <Wire items={data.wire} seen={seen} onOpen={onOpenArticle} />
        </div>
      </div>
    </>
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
