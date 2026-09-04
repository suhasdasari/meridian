"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Article, Cluster } from "@/lib/news/types";
import { formatAge } from "@/lib/news/format";
import { cn } from "@/lib/utils";
import { StoryImage } from "./story-image";

const CARD_W = 320;
const CARD_H = 400;
const GAP = 14;
const PAD = 16;

export type PeekStory = {
  title: string;
  excerpt: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
};

export function articlePeek(article: Article): PeekStory {
  return {
    title: article.title,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    source: article.source,
    publishedAt: article.publishedAt,
  };
}

export function clusterPeek(cluster: Cluster): PeekStory {
  return {
    title: cluster.title,
    excerpt: cluster.excerpt,
    imageUrl: cluster.imageUrl,
    source:
      cluster.sourceCount > 1
        ? `${cluster.sourceCount} outlets`
        : (cluster.articles[0]?.source ?? ""),
    publishedAt: cluster.publishedAt,
  };
}

function canHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function place(rect: DOMRect): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const leftFit = rect.left - PAD >= CARD_W + GAP;
  const rightFit = vw - rect.right - PAD >= CARD_W + GAP;
  const belowFit = vh - rect.bottom - PAD >= 180;
  const aboveFit = rect.top - PAD >= 180;

  let x: number;
  let y: number;

  if (leftFit) {
    x = rect.left - CARD_W - GAP;
    y = clamp(rect.top, PAD, vh - CARD_H - PAD);
  } else if (rightFit) {
    x = rect.right + GAP;
    y = clamp(rect.top, PAD, vh - CARD_H - PAD);
  } else if (rect.top < 88) {
    x = clamp(rect.left, PAD, vw - CARD_W - PAD);
    y = rect.bottom + GAP;
  } else if (belowFit) {
    x = clamp(rect.left + 48, PAD, vw - CARD_W - PAD);
    y = rect.bottom + GAP;
  } else if (aboveFit) {
    x = clamp(rect.left + 48, PAD, vw - CARD_W - PAD);
    y = clamp(rect.top - CARD_H - GAP, PAD, vh - CARD_H - PAD);
  } else {
    x = clamp(rect.left, PAD, vw - CARD_W - PAD);
    y = PAD;
  }
  return { x, y };
}

type PeekApi = {
  show: (story: PeekStory, rect: DOMRect) => void;
  hide: () => void;
  hideNow: () => void;
};

const PeekContext = createContext<PeekApi | null>(null);

export function PeekProvider({ children }: { children: ReactNode }) {
  const [story, setStory] = useState<PeekStory | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimer = useRef(0);
  const hideTimer = useRef(0);

  const show = useCallback((next: PeekStory, rect: DOMRect) => {
    if (!canHover()) return;
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    const delay = visibleRef.current ? 40 : 160;
    showTimer.current = window.setTimeout(() => {
      setStory(next);
      setPos(place(rect));
      setVisible(true);
      visibleRef.current = true;
    }, delay);
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      visibleRef.current = false;
    }, 80);
  }, []);

  const hideNow = useCallback(() => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    setVisible(false);
    visibleRef.current = false;
  }, []);

  useEffect(() => {
    const onScroll = () => hideNow();
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, [hideNow]);

  const api = useMemo(() => ({ show, hide, hideNow }), [show, hide, hideNow]);

  return (
    <PeekContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" && story
        ? createPortal(
            <aside
              aria-hidden="true"
              className={cn(
                "pointer-events-none fixed z-40 w-80 overflow-hidden rounded-xl bg-elevated shadow-[var(--shadow-border)] transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
                visible
                  ? "translate-y-0 opacity-100 blur-0"
                  : "translate-y-1 opacity-0 blur-sm",
              )}
              style={{ left: pos.x, top: pos.y }}
            >
              {story.imageUrl ? (
                <StoryImage
                  key={story.imageUrl}
                  src={story.imageUrl}
                  alt=""
                  className="aspect-video w-full"
                />
              ) : null}
              <div className="px-4 py-3">
                <p className="line-clamp-3 font-display text-lg font-medium leading-snug text-fg">
                  {story.title}
                </p>
                {story.excerpt ? (
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">
                    {story.excerpt}
                  </p>
                ) : null}
                <p className="mt-2 font-mono text-xs text-subtle">
                  {story.source}
                  {story.publishedAt ? ` · ${formatAge(story.publishedAt)}` : ""}
                </p>
              </div>
            </aside>,
            document.body,
          )
        : null}
    </PeekContext.Provider>
  );
}

export function usePeek(): PeekApi {
  const ctx = useContext(PeekContext);
  if (!ctx) throw new Error("PeekProvider missing");
  return ctx;
}

export function usePeekHandlers(story: PeekStory) {
  const peek = usePeek();
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      peek.show(story, e.currentTarget.getBoundingClientRect());
    },
    onMouseLeave: () => peek.hide(),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      peek.show(story, e.currentTarget.getBoundingClientRect());
    },
    onBlur: () => peek.hide(),
  };
}
