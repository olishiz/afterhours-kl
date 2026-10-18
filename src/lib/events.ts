import snapshot from "@/data/events.json";

export interface NightEvent {
  id: string;
  title: string;
  venue: string;
  area: string;
  region: "Kuala Lumpur" | "Selangor";
  category: string;
  genres: string[];
  startAt: string | null;
  endAt?: string | null;
  price: string | null;
  image: string | null;
  url: string;
  source: string;
  description: string;
  kind: "event" | "venue";
  verifiedAt: string;
  featured?: boolean;
}

export interface EventSource {
  id: string;
  name: string;
  url: string;
  status: string;
  lastChecked: string | null;
  count: number;
  note: string;
}

export const events: NightEvent[] = snapshot.events as NightEvent[];
export const sources: EventSource[] = snapshot.sources;
export const lastUpdated: string = snapshot.lastUpdated;
