import { BEAT_LABEL, LEGEND_BEATS, type Beat } from "@/lib/news/beats";
import { cn } from "@/lib/utils";

export const BEAT_DOT: Record<Beat, string> = {
  money: "bg-beat-money",
  conflict: "bg-beat-conflict",
  crime: "bg-beat-crime",
  accident: "bg-beat-accident",
  civic: "bg-beat-civic",
  politics: "bg-beat-politics",
  faith: "bg-beat-faith",
  humor: "bg-beat-humor",
  general: "bg-subtle",
};

export const BEAT_TEXT: Record<Beat, string> = {
  money: "text-beat-money",
  conflict: "text-beat-conflict",
  crime: "text-beat-crime",
  accident: "text-beat-accident",
  civic: "text-beat-civic",
  politics: "text-beat-politics",
  faith: "text-beat-faith",
  humor: "text-beat-humor",
  general: "text-subtle",
};

export const BEAT_BAR: Record<Beat, string> = {
  money: "bg-beat-money",
  conflict: "bg-beat-conflict",
  crime: "bg-beat-crime",
  accident: "bg-beat-accident",
  civic: "bg-beat-civic",
  politics: "bg-beat-politics",
  faith: "bg-beat-faith",
  humor: "bg-beat-humor",
  general: "bg-border",
};

export function BeatKicker({ beat, className }: { beat: Beat; className?: string }) {
  if (beat === "general") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs tracking-kicker uppercase",
        BEAT_TEXT[beat],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", BEAT_DOT[beat])} aria-hidden="true" />
      {BEAT_LABEL[beat]}
    </span>
  );
}

export function BeatRail({ beat }: { beat: Beat }) {
  return <span className={cn("w-0.5 self-stretch rounded-full", BEAT_BAR[beat])} aria-hidden="true" />;
}

export function BeatLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {LEGEND_BEATS.map((beat) => (
        <li key={beat} className="inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", BEAT_DOT[beat])} aria-hidden="true" />
          <span className="font-mono text-xs tracking-kicker text-subtle uppercase">{BEAT_LABEL[beat]}</span>
        </li>
      ))}
    </ul>
  );
}
