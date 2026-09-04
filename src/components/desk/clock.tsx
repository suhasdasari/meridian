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
    <div className="flex flex-col items-end gap-0.5 text-right">
      <p className="font-mono text-xs tracking-wider text-muted uppercase tabular-nums">
        {formatEditionDate(now)}
      </p>
      <p className="font-mono text-sm text-fg tabular-nums" suppressHydrationWarning>
        {formatUtcClock(now)} <span className="text-subtle">UTC</span>
      </p>
    </div>
  );
}
