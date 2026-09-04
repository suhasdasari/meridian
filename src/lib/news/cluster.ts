import { hashId } from "@/lib/utils";
import type { Article, Cluster, DeskKind, Region } from "./types";
import { majorityBeat } from "./beats";

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "at",
  "by",
  "from",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "after",
  "over",
  "into",
  "about",
  "its",
  "it",
  "this",
  "that",
  "new",
  "says",
  "say",
  "said",
  "will",
  "not",
  "has",
  "have",
  "had",
  "who",
  "what",
  "when",
  "where",
  "how",
  "why",
  "their",
  "they",
  "his",
  "her",
  "she",
  "him",
  "than",
  "more",
  "most",
  "amid",
  "near",
  "under",
  "out",
  "up",
  "off",
  "vs",
]);

export function tokensOf(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sameStory(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  if (inter >= 3) return true;
  return jaccard(a, b) >= 0.46;
}

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]!]!;
      i = this.parent[i]!;
    }
    return i;
  }
  union(a: number, b: number) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent[pb] = pa;
  }
}

function uniqueSources(articles: Article[]): number {
  return new Set(articles.map((a) => a.source.toLowerCase())).size;
}

function regionsOf(articles: Article[]): Region[] {
  const order: Region[] = ["Africa", "Americas", "Asia", "Europe", "Oceania", "International"];
  const present = new Set(articles.map((a) => a.region));
  return order.filter((r) => present.has(r));
}

function newest(articles: Article[]): string {
  return articles.reduce((max, a) => (a.publishedAt > max ? a.publishedAt : max), articles[0]?.publishedAt ?? "");
}

function pickTitle(articles: Article[]): string {
  const ranked = [...articles].sort((a, b) => {
    const src = uniqueSources([b]) - uniqueSources([a]);
    if (src !== 0) return src;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
  const mid = ranked.find((a) => a.title.length >= 28 && a.title.length <= 110);
  return (mid ?? ranked[0])?.title ?? "";
}

function toCluster(articles: Article[]): Cluster {
  const sorted = [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const sourceCount = uniqueSources(sorted);
  const publishedAt = newest(sorted);
  const ageH = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  const major = sourceCount >= 5 && ageH <= 8;
  const desks = sorted.map((a) => a.desk);
  const desk: DeskKind = desks.filter((d) => d === "planet").length > desks.length / 2 ? "planet" : "affairs";
  return {
    id: hashId(sorted.map((a) => a.id).sort().join("|")),
    title: pickTitle(sorted),
    excerpt: sorted.find((a) => a.excerpt.length > 40)?.excerpt ?? sorted[0]?.excerpt ?? "",
    imageUrl: sorted.find((a) => a.imageUrl)?.imageUrl ?? null,
    publishedAt,
    articles: sorted,
    sourceCount,
    regions: regionsOf(sorted),
    desk,
    major,
    beat: majorityBeat(
      sorted.map((a) => a.beat),
      pickTitle(sorted),
      sorted.find((a) => a.excerpt.length > 40)?.excerpt ?? sorted[0]?.excerpt ?? "",
    ),
  };
}

export function clusterArticles(articles: Article[]): Cluster[] {
  if (articles.length === 0) return [];
  const tokenSets = articles.map((a) => new Set(tokensOf(a.title)));
  const uf = new UnionFind(articles.length);

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      if (sameStory(tokenSets[i]!, tokenSets[j]!)) uf.union(i, j);
    }
  }

  const groups = new Map<number, Article[]>();
  for (let i = 0; i < articles.length; i++) {
    const root = uf.find(i);
    const list = groups.get(root) ?? [];
    list.push(articles[i]!);
    groups.set(root, list);
  }

  const clusters = [...groups.values()].map(toCluster);
  clusters.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
  return clusters;
}

export function pickLead(clusters: Cluster[]): Cluster | null {
  if (clusters.length === 0) return null;
  const now = Date.now();
  const scored = clusters.map((c) => {
    const ageH = Math.max(0, (now - new Date(c.publishedAt).getTime()) / 3_600_000);
    const recency = Math.max(0, 1 - ageH / 24);
    const spread = c.regions.filter((r) => r !== "International").length;
    const score = c.sourceCount * 3 + spread * 1.4 + recency * 4 + (c.major ? 5 : 0);
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}

export function pickGallery(clusters: Cluster[], articles: Article[] = [], n = 10): Cluster[] {
  const seen = new Set<string>();
  const out: Cluster[] = [];
  const keyOf = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);

  const push = (c: Cluster) => {
    const key = keyOf(c.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    out.push(c);
    return out.length >= n;
  };

  const pictured = clusters
    .filter((c) => c.imageUrl)
    .sort((a, b) => {
      if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  for (const c of pictured) if (push(c)) return out;

  const used = new Set(out.flatMap((c) => c.articles.map((a) => a.id)));
  const leftover = articles
    .filter((a) => a.imageUrl && !used.has(a.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const a of leftover) {
    const filled: Cluster = {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt,
      articles: [a],
      sourceCount: 1,
      regions: [a.region],
      desk: a.desk,
      major: false,
      beat: a.beat,
    };
    if (push(filled)) return out;
  }

  for (const c of clusters) {
    if (c.imageUrl) continue;
    if (push(c)) return out;
  }
  return out;
}
