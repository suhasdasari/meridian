import { XMLParser } from "fast-xml-parser";
import { hashId } from "@/lib/utils";
import type { Article, DeskKind, Region } from "./types";
import { inferDesk, regionForDomain } from "./sources";
import { inferBeat } from "./beats";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#text",
  trimValues: true,
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec["#text"] === "string") return rec["#text"];
    if (typeof rec["@_href"] === "string") return rec["@_href"];
    if (typeof rec.url === "string") return rec.url;
    if (typeof rec.href === "string") return rec.href;
  }
  return "";
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/"/gi, '"')
    .replace(/&#39;|'/gi, "'")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

export function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function salvageExcerpt(text: string, title: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 50) return "";
  const withoutTitle = cleaned.startsWith(title) ? cleaned.slice(title.length).trim() : cleaned;
  if (withoutTitle.length < 40) return "";
  return withoutTitle.slice(0, 280);
}

function httpsUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

function unwrapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const inner = parsed.searchParams.get("url");
    if (inner && inner.startsWith("http")) return inner;
  } catch {
    /* keep original */
  }
  return url;
}

function firstImage(html: string, node: Record<string, unknown>): string | null {
  const candidates = [
    ...asArray(node["media:content"]),
    ...asArray(node["media:thumbnail"]),
    ...asArray(node.enclosure),
  ];
  for (const m of candidates) {
    if (m && typeof m === "object") {
      const rec = m as Record<string, unknown>;
      const url = textOf(rec["@_url"] ?? rec.url);
      const type = textOf(rec["@_type"] ?? rec.type).toLowerCase();
      if (!url.startsWith("http")) continue;
      if (type && !type.startsWith("image") && (type.includes("video") || type.includes("audio"))) continue;
      return httpsUrl(url);
    }
  }
  const newsImg = textOf(node["News:Image"]);
  if (newsImg.startsWith("http")) return httpsUrl(newsImg);
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]?.startsWith("http")) return httpsUrl(match[1]);
  return null;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceFromTitle(title: string): { title: string; source: string | null } {
  const trimmed = title.replace(/\s+/g, " ").trim();
  const dash = trimmed.lastIndexOf(" - ");
  const em = trimmed.lastIndexOf(" — ");
  const idx = Math.max(dash, em);
  if (idx < 12) return { title: trimmed, source: null };
  const sepLen = dash === idx ? 3 : 3;
  const source = trimmed.slice(idx + sepLen).trim();
  if (source.length >= 2 && source.length <= 70 && !/^https?:/i.test(source)) {
    return { title: trimmed.slice(0, idx).trim(), source };
  }
  return { title: trimmed, source: null };
}

function sourceFromDescription(html: string): string | null {
  const match = html.match(/<font[^>]*>\s*([^<]{2,70})\s*<\/font>/i);
  const value = match?.[1]?.replace(/&nbsp;/g, " ").trim() || "";
  if (!value || value.startsWith("©") || value.startsWith("&copy;")) return null;
  if (/^(by |updated |photo )/i.test(value)) return null;
  return value;
}

function toArticle(opts: {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  excerpt: string;
  imageUrl: string | null;
  region: Region;
  desk: DeskKind;
  origin: string;
}): Article | null {
  const title = opts.title.trim();
  const url = opts.url.trim();
  if (!title || !url || !url.startsWith("http")) return null;
  const sourceDomain = domainOf(url) || domainOf(`https://${opts.origin}`);
  return {
    id: hashId(`${url}|${title}`),
    title,
    url,
    source: opts.source || sourceDomain || "Unknown outlet",
    sourceDomain,
    region: regionForDomain(sourceDomain, opts.region),
    publishedAt: opts.publishedAt,
    excerpt: opts.excerpt.slice(0, 280),
    imageUrl: opts.imageUrl,
    desk: inferDesk(title, opts.desk),
    origin: opts.origin,
    beat: inferBeat(title, opts.excerpt),
  };
}

export function parseRssXml(
  xml: string,
  meta: { name: string; region: Region; desk: DeskKind; origin: string },
): Article[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const rdf = (parsed["rdf:RDF"] ?? parsed.RDF) as Record<string, unknown> | undefined;
  const feed = parsed.feed as Record<string, unknown> | undefined;

  const items = [
    ...asArray(channel?.item as Record<string, unknown>[] | undefined),
    ...asArray(rdf?.item as Record<string, unknown>[] | undefined),
    ...asArray(feed?.entry as Record<string, unknown>[] | undefined),
  ];

  const articles: Article[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const sourceNode = item.source as Record<string, unknown> | string | undefined;
    const rawTitle = stripHtml(textOf(item.title));
    const rawDesc =
      textOf(item.description) ||
      textOf(item.summary) ||
      textOf(item.content) ||
      textOf(item["content:encoded"]) ||
      "";
    const fromTitle = meta.origin.startsWith("gn-") ? sourceFromTitle(rawTitle) : { title: rawTitle, source: null };
    const tagged =
      (typeof sourceNode === "string" ? sourceNode : textOf(sourceNode)) ||
      textOf(item["dc:creator"]) ||
      textOf(item["dc:publisher"]);
    const described = sourceFromDescription(rawDesc);
    const bingSource = textOf(item["News:Source"]);
    const sourceName = fromTitle.source || tagged || described || bingSource || meta.name;
    const title = fromTitle.source ? fromTitle.title : rawTitle;
    const linkVal = item.link;
    let url = "";
    if (typeof linkVal === "string") url = linkVal;
    else if (Array.isArray(linkVal)) {
      const alt = linkVal.find((l) => {
        const rel = textOf((l as Record<string, unknown>)["@_rel"]);
        return rel === "alternate" || !rel;
      });
      url = textOf(alt ?? linkVal[0]);
    } else {
      url = textOf(linkVal) || textOf(item.guid) || textOf(item.id);
    }
    url = unwrapUrl(url);

    const excerpt = meta.origin.startsWith("gn-")
      ? salvageExcerpt(stripHtml(rawDesc), title)
      : stripHtml(rawDesc);
    const published = parseDate(
      textOf(item.pubDate) ||
        textOf(item.published) ||
        textOf(item.updated) ||
        textOf(item["dc:date"]) ||
        "",
    );
    const imageUrl = firstImage(rawDesc, item);

    const article = toArticle({
      title,
      url,
      source: sourceName,
      publishedAt: published,
      excerpt,
      imageUrl,
      region: meta.region,
      desk: meta.desk,
      origin: meta.origin,
    });
    if (article) articles.push(article);
  }
  return articles;
}

type GdeltDoc = {
  articles?: Array<{
    url?: string;
    title?: string;
    seendate?: string;
    domain?: string;
    socialimage?: string;
    sourcecountry?: string;
  }>;
};

export function parseGdelt(json: unknown, desk: DeskKind): Article[] {
  const doc = json as GdeltDoc;
  const out: Article[] = [];
  for (const row of doc.articles ?? []) {
    const article = toArticle({
      title: stripHtml(row.title ?? ""),
      url: row.url ?? "",
      source: row.domain ?? "GDELT",
      publishedAt: parseGdeltDate(row.seendate ?? ""),
      excerpt: "",
      imageUrl: row.socialimage?.startsWith("http") ? row.socialimage : null,
      region: "International",
      desk,
      origin: "gdelt",
    });
    if (article) out.push(article);
  }
  return out;
}

function parseGdeltDate(raw: string): string {
  // 20260903T201500Z
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`;
    return parseDate(iso);
  }
  return parseDate(raw);
}

type ReliefDoc = {
  data?: Array<{
    href?: string;
    fields?: {
      title?: string;
      date?: { created?: string };
      url?: string;
      source?: Array<{ name?: string }>;
    };
  }>;
};

export function parseReliefWeb(json: unknown): Article[] {
  const doc = json as ReliefDoc;
  const out: Article[] = [];
  for (const row of doc.data ?? []) {
    const fields = row.fields ?? {};
    const source = fields.source?.[0]?.name ?? "ReliefWeb";
    const article = toArticle({
      title: stripHtml(fields.title ?? ""),
      url: fields.url || row.href || "",
      source,
      publishedAt: parseDate(fields.date?.created ?? ""),
      excerpt: "",
      imageUrl: null,
      region: "International",
      desk: "affairs",
      origin: "reliefweb",
    });
    if (article) out.push(article);
  }
  return out;
}

type WikiFeed = {
  news?: Array<{
    story?: string;
    links?: Array<{
      title?: string;
      content_urls?: { desktop?: { page?: string } };
    }>;
  }>;
};

export function parseWikipedia(json: unknown): Article[] {
  const doc = json as WikiFeed;
  const out: Article[] = [];
  for (const item of doc.news ?? []) {
    const story = stripHtml(item.story ?? "");
    const link = item.links?.[0];
    const url = link?.content_urls?.desktop?.page ?? "";
    const title = (link?.title ?? story).replace(/_/g, " ");
    const article = toArticle({
      title,
      url,
      source: "Wikipedia Current Events",
      publishedAt: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      excerpt: story,
      imageUrl: null,
      region: "International",
      desk: "affairs",
      origin: "wikipedia",
    });
    if (article) out.push(article);
  }
  return out;
}

export function wikipediaFeaturedUrl(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`;
}
