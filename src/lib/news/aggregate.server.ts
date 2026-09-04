import type { Article, DeskPayload } from "./types";
import { clusterArticles, pickGallery, pickLead } from "./cluster";
import { findCountry } from "./countries";
import {
  bingCountryFeed,
  gdeltCountryFeed,
  googleCountryFeeds,
  REGION_FEEDS,
  WORLD_FEEDS,
  type Feed,
} from "./sources";
import {
  parseGdelt,
  parseReliefWeb,
  parseRssXml,
  parseWikipedia,
  wikipediaFeaturedUrl,
} from "./parse";

const CACHE_TTL_MS = 90_000;
const STALE_MS = 12 * 60_000;
const FETCH_TIMEOUT_MS = 5500;
const CONCURRENCY = 10;
const BUDGET_MS = 10000;

type CacheEntry = {
  at: number;
  articles: Article[];
  ok: boolean;
};

const feedCache = new Map<string, CacheEntry>();

const UA =
  "MeridianDesk/1.0 (world news desk; aggregation; educational; contact: meridian)";

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": UA,
        accept:
          "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseFeed(feed: Feed, body: string): Article[] {
  if (feed.kind === "gdelt") {
    try {
      return parseGdelt(JSON.parse(body), feed.desk);
    } catch {
      return [];
    }
  }
  if (feed.kind === "reliefweb") {
    try {
      return parseReliefWeb(JSON.parse(body));
    } catch {
      return [];
    }
  }
  if (feed.kind === "wikipedia") {
    try {
      return parseWikipedia(JSON.parse(body));
    } catch {
      return [];
    }
  }
  return parseRssXml(body, {
    name: feed.name,
    region: feed.region,
    desk: feed.desk,
    origin: feed.id,
  });
}

async function loadFeed(feed: Feed): Promise<CacheEntry> {
  const url = feed.kind === "wikipedia" ? wikipediaFeaturedUrl() : feed.url;
  const cached = feedCache.get(`${feed.id}:v7`);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached;

  try {
    const body = await fetchText(url);
    const articles = parseFeed(feed, body).map((a) => ({
      ...a,
      origin: feed.id,
    }));
    const entry: CacheEntry = { at: now, articles, ok: true };
    feedCache.set(`${feed.id}:v7`, entry);
    return entry;
  } catch {
    if (cached && now - cached.at < STALE_MS) return cached;
    const entry: CacheEntry = { at: now, articles: [], ok: false };
    feedCache.set(`${feed.id}:v7`, entry);
    return entry;
  }
}

function feedsFor(country: string): Feed[] {
  if (country === "WORLD") return WORLD_FEEDS;
  const info = findCountry(country);
  const local = REGION_FEEDS[info.code] ?? [];
  return [
    ...local,
    bingCountryFeed(info.code, info.name, info.region),
    ...googleCountryFeeds(info.code, info.name),
    gdeltCountryFeed(info.code, info.name, info.region),
  ];
}

function dedupe(articles: Article[]): Article[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: Article[] = [];
  const sorted = [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const a of sorted) {
    const urlKey = a.url.split("?")[0]!.toLowerCase();
    const titleKey = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seenUrl.has(urlKey)) continue;
    if (titleKey.length > 20 && seenTitle.has(`${a.source.toLowerCase()}|${titleKey}`)) continue;
    seenUrl.add(urlKey);
    seenTitle.add(`${a.source.toLowerCase()}|${titleKey}`);
    out.push(a);
  }
  return out;
}

export async function loadDesk(countryCode: string): Promise<DeskPayload> {
  const country = findCountry(countryCode);
  const feeds = feedsFor(country.code);
  const started = Date.now();
  const results = await mapPool(feeds, CONCURRENCY, async (feed) => {
    if (Date.now() - started > BUDGET_MS) {
      return feedCache.get(`${feed.id}:v7`) ?? { at: 0, articles: [], ok: false };
    }
    return loadFeed(feed);
  });

  let failedSources = 0;
  const collected: Article[] = [];
  const okNames = new Set<string>();
  for (let i = 0; i < feeds.length; i++) {
    const entry = results[i]!;
    if (!entry.ok && entry.articles.length === 0) failedSources += 1;
    else okNames.add(feeds[i]!.name);
    collected.push(...entry.articles);
  }

  const articles = dedupe(collected);
  const isWorld = country.code === "WORLD";
  const forCluster = articles.slice(0, isWorld ? 140 : 220);
  const clusters = clusterArticles(forCluster);

  if (isWorld) {
    const lead = pickLead(clusters);
    const used = new Set(lead ? lead.articles.map((a) => a.id) : []);
    const rest = clusters.filter((c) => c.id !== lead?.id);
    const affairs = rest.filter((c) => c.desk === "affairs").slice(0, 16);
    const planet = rest.filter((c) => c.desk === "planet").slice(0, 16);
    const wire = articles
      .filter((a) => !used.has(a.id))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 140);
    return {
      country: country.code,
      countryName: country.name,
      generatedAt: new Date().toISOString(),
      lead,
      gallery: [],
      liners: [],
      wire,
      affairs,
      planet,
      sourceCount: okNames.size,
      articleCount: articles.length,
      failedSources,
    };
  }

  const gallery = pickGallery(clusters, articles, 10);
  const used = new Set(gallery.flatMap((c) => c.articles.map((a) => a.id)));
  const remaining = articles
    .filter((a) => !used.has(a.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const liners = remaining.slice(0, 28);
  const linerIds = new Set(liners.map((a) => a.id));
  const wire = remaining.filter((a) => !linerIds.has(a.id)).slice(0, 160);

  return {
    country: country.code,
    countryName: country.name,
    generatedAt: new Date().toISOString(),
    lead: gallery[0] ?? null,
    gallery,
    liners,
    wire,
    affairs: [],
    planet: [],
    sourceCount: okNames.size,
    articleCount: articles.length,
    failedSources,
  };
}
