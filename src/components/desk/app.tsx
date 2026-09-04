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

  useEffect(() => {
    if (!query.data) return;
    const ids = [
      ...(query.data.lead?.articles.map((a) => a.id) ?? []),
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
    const items = data.wire.slice(0, 18);
    return [...items, ...items];
  }, [data.wire]);

  function openCluster(cluster: Cluster) {
    peek.hideNow();
    setOpen(cluster);
  }

  function openArticle(article: Article) {
    peek.hideNow();
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)] lg:items-stretch">
          <div>
            {data.lead ? (
              <LeadStory cluster={data.lead} onOpen={openCluster} nowMs={nowMs} />
            ) : query.isLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="rounded-xl bg-surface px-5 py-10 shadow-[var(--shadow-border)]">
                <p className="font-mono text-xs tracking-kicker text-subtle uppercase">Lead</p>
                <p className="mt-2 font-display text-2xl text-fg">No clustered lead this cycle.</p>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  The wire below still lists every item that arrived.
                </p>
              </div>
            )}
          </div>
          <div className="hidden h-96 lg:block">
            <Wire items={data.wire} seen={seen} onOpen={openArticle} />
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
              <Wire items={data.wire} seen={seen} onOpen={openArticle} />
            </div>
          ) : null}
          {tab === "affairs" ? (
            <DeskColumn
              kicker="Desk one"
              title="World affairs"
              clusters={data.affairs}
              onOpen={openCluster}
              nowMs={nowMs}
            />
          ) : null}
          {tab === "planet" ? (
            <DeskColumn
              kicker="Desk two"
              title="Planet"
              clusters={data.planet}
              onOpen={openCluster}
              nowMs={nowMs}
            />
          ) : null}
        </div>

        <div className="mt-4 hidden grid-cols-2 gap-4 lg:grid">
          <DeskColumn
            kicker="Desk one"
            title="World affairs"
            clusters={data.affairs}
            onOpen={openCluster}
            nowMs={nowMs}
          />
          <DeskColumn
            kicker="Desk two"
            title="Planet"
            clusters={data.planet}
            onOpen={openCluster}
            nowMs={nowMs}
          />
        </div>

        <footer className="mt-10 max-w-3xl pb-10 text-sm leading-relaxed text-subtle">
          <p>
            Meridian does not editorialize, score sentiment, or rewrite headlines. The lead is
            the cluster with the most independent outlets in this cycle, weighted only by recency
            and geographic spread of coverage. The wire is chronological. Sources include public
            broadcasters, wire and newspaper RSS, Google News editions, GDELT, ReliefWeb, UN News,
            WHO, and Wikipedia current events — drawn from every region.
          </p>
        </footer>
      </main>

      {open ? <StoryPanel cluster={open} onClose={() => setOpen(null)} nowMs={nowMs} /> : null}
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
