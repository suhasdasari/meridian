export type Region =
  | "Africa"
  | "Americas"
  | "Asia"
  | "Europe"
  | "Oceania"
  | "International";

export type DeskKind = "affairs" | "planet";

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  region: Region;
  publishedAt: string;
  excerpt: string;
  imageUrl: string | null;
  desk: DeskKind;
  origin: string;
};

export type Cluster = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  publishedAt: string;
  articles: Article[];
  sourceCount: number;
  regions: Region[];
  desk: DeskKind;
  major: boolean;
};

export type DeskPayload = {
  country: string;
  countryName: string;
  generatedAt: string;
  lead: Cluster | null;
  wire: Article[];
  affairs: Cluster[];
  planet: Cluster[];
  sourceCount: number;
  articleCount: number;
  failedSources: number;
};
