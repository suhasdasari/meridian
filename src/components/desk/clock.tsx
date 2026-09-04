"use client";

import { useEffect, useState } from "react";
import { formatEditionDate, formatUtcClock } from "@/lib/news/format";

export function LiveClock({ initialIso }: { initialIso: string }) {
  const [now, setNow] = useState(() => new Date(initialIso));

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="font-mono text-xs tracking-wider text-muted uppercase tabular-nums">
      <span className="hidden sm:inline">{formatEditionDate(now)} · </span>
      <span className="text-fg" suppressHydrationWarning>
        {formatUtcClock(now)}
      </span>{" "}
      <span className="text-subtle">UTC</span>
    </p>
  );
}
