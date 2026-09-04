export const BEATS = [
  "money",
  "conflict",
  "crime",
  "accident",
  "civic",
  "politics",
  "faith",
  "humor",
  "general",
] as const;

export type Beat = (typeof BEATS)[number];

export const BEAT_LABEL: Record<Beat, string> = {
  money: "Money",
  conflict: "Conflict",
  crime: "Crime",
  accident: "Accident",
  civic: "Civic",
  politics: "Politics",
  faith: "Faith",
  humor: "Humor",
  general: "General",
};

/** Named beats only — general is the unmarked remainder. */
export const LEGEND_BEATS: Beat[] = [
  "money",
  "conflict",
  "crime",
  "accident",
  "civic",
  "politics",
  "faith",
  "humor",
];

type Rule = { beat: Beat; re: RegExp };

const RULES: Rule[] = [
  {
    beat: "humor",
    re: /\b(comedy|comedian|satire|satirical|funny|hilarious|joke|parody|meme|stand-up|standup)\b/i,
  },
  {
    beat: "faith",
    re: /\b(church|mosque|temple|synagogue|vatican|pope|imam|rabbi|pastor|cleric|quran|bible|torah|ramadan|hajj|diwali|easter sunday|religious|religion|hindu nationalist|fatwa)\b/i,
  },
  {
    beat: "crime",
    re: /\b(murder|homicide|manslaughter|stabbed|stabbing|shot dead|gunman|assault|robbery|rapist|raped|\brape\b|kidnap|trafficking|homicide|serial killer|charged with|indicted for|arrested for)\b/i,
  },
  {
    beat: "conflict",
    re: /\b(war|warfare|invasion|airstrike|air strike|missile|bombard|ceasefire|battlefield|frontline|artillery|occupation of|militia|insurgent|drone strike|troops|soldiers killed)\b/i,
  },
  {
    beat: "accident",
    re: /\b((plane|bus|train|car|road|air|flight).{0,16}crash|crash(es|ed)? (kills|killing|into)|collision|derail|earthquake|flood|flooding|wildfire|landslide|tsunami|capsized|building collapse)\b/i,
  },
  {
    beat: "money",
    re: /\b(gdp|inflation|interest rate|central bank|stock market|shares|tariff|trade deal|recession|budget|rupee|oil price|investor|ipo|crypto|bitcoin|economy|economic|fiscal|bank sees shares|lender|nominal)\b/i,
  },
  {
    beat: "politics",
    re: /\b(election|electoral|parliament|congress|senate|prime minister|president|coalition|ballot|campaign trail|opposition party|lawmaker|legislat|white house|lok sabha|chancellor|cabinet)\b/i,
  },
  {
    beat: "civic",
    re: /\b(supreme court|high court|lawsuit|verdict|ruling|constitution|protest|protesters|civil rights|asylum|refugee|labour union|labor union|demonstration|strike over)\b/i,
  },
];

export function inferBeat(title: string, excerpt = ""): Beat {
  const text = `${title} ${excerpt}`;
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.beat;
  }
  return "general";
}

export function majorityBeat(beats: Beat[], fallbackTitle: string, fallbackExcerpt = ""): Beat {
  const counts = new Map<Beat, number>();
  for (const b of beats) {
    if (b === "general") continue;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let best: Beat | null = null;
  let n = 0;
  for (const [b, c] of counts) {
    if (c > n) {
      best = b;
      n = c;
    }
  }
  if (best && n > 0) return best;
  return inferBeat(fallbackTitle, fallbackExcerpt);
}
