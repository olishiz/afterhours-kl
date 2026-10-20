import snapshot from "@/data/places.json";

export interface NightPlace {
  id: string;
  name: string;
  area: string;
  region: "Kuala Lumpur" | "Selangor";
  category: string;
  genres: string[];
  description: string;
  image: string | null;
  imageSource: string | null;
  url: string;
  instagram: string | null;
  threads: string | null;
  address: string;
  verifiedAt: string;
  sourceUrls: string[];
}

export const places: NightPlace[] = snapshot.places as NightPlace[];
export const placesLastUpdated: string = snapshot.lastUpdated;
