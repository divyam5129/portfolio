// Camping trips for the Trail Map and Gallery.
// Trips are drawn in chronological order of `date` (YYYY-MM).

export type Trip = {
  id: string;
  name: string; // "Big Sur: Pfeiffer Campground"
  lat: number;
  lng: number;
  date: string; // "2025-08"
  blurb: string; // 1–2 lines
  photos: string[]; // paths in /public/photos; empty = grey placeholder
  nights?: number;
  /** Colour family for the pin and placeholder art. */
  biome?: Biome;
};

export type Biome = "coast" | "forest" | "desert" | "alpine" | "lake" | "volcanic";

export const campingConfig: {
  region: "us" | "ca";
  /** Optional total trail miles. Leave undefined to render "—". */
  miles?: number;
} = {
  region: "ca",
  miles: undefined, // TODO: add if you track it
};

// PLACEHOLDER: replace with real trips (names, dates, nights, blurbs and photos).
export const trips: Trip[] = [
  {
    id: "point-reyes",
    name: "Point Reyes: Coast Camp",
    lat: 38.0156,
    lng: -122.8556,
    date: "2023-10",
    blurb: "PLACEHOLDER: fog rolling off the Pacific, elk on the bluffs.",
    photos: [],
    nights: 1,
    biome: "coast",
  },
  {
    id: "pinnacles",
    name: "Pinnacles: Pinnacles Campground",
    lat: 36.4934,
    lng: -121.1462,
    date: "2024-03",
    blurb: "PLACEHOLDER: talus caves with a headlamp, condors overhead.",
    photos: [],
    nights: 2,
    biome: "desert",
  },
  {
    id: "big-sur",
    name: "Big Sur: Pfeiffer Campground",
    lat: 36.2508,
    lng: -121.7845,
    date: "2024-06",
    blurb: "PLACEHOLDER: redwoods by the river, sunset on Highway 1.",
    photos: [],
    nights: 2,
    biome: "coast",
  },
  {
    id: "yosemite",
    name: "Yosemite Valley: Upper Pines",
    lat: 37.7356,
    lng: -119.5627,
    date: "2024-08",
    blurb: "PLACEHOLDER: granite walls at first light, Mist Trail by mid-morning.",
    photos: [],
    nights: 3,
    biome: "alpine",
  },
  {
    id: "tahoe",
    name: "Lake Tahoe: D.L. Bliss",
    lat: 38.9741,
    lng: -120.1013,
    date: "2024-09",
    blurb: "PLACEHOLDER: clear water, cold mornings, Rubicon Trail.",
    photos: [],
    nights: 2,
    biome: "lake",
  },
  {
    id: "joshua-tree",
    name: "Joshua Tree: Jumbo Rocks",
    lat: 33.9918,
    lng: -116.0619,
    date: "2025-01",
    blurb: "PLACEHOLDER: boulders, desert silence, more stars than sky.",
    photos: [],
    nights: 2,
    biome: "desert",
  },
  {
    id: "sequoia",
    name: "Sequoia: Lodgepole",
    lat: 36.6047,
    lng: -118.7246,
    date: "2025-06",
    blurb: "PLACEHOLDER: the biggest trees on earth, and a long climb to Alta Peak.",
    photos: [],
    nights: 2,
    biome: "forest",
  },
  {
    id: "lassen",
    name: "Lassen Volcanic: Manzanita Lake",
    lat: 40.5329,
    lng: -121.5639,
    date: "2025-08",
    blurb: "PLACEHOLDER: steaming fumaroles and a lake that mirrors the peak.",
    photos: [],
    nights: 2,
    biome: "volcanic",
  },
];

export const tripsChronological = [...trips].sort((a, b) => a.date.localeCompare(b.date));

export function formatTripDate(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m ? `${months[m - 1]} ${y}` : String(y);
}

/** Short place name for captions: "Big Sur: Pfeiffer Campground" -> "Big Sur" */
export function shortName(name: string): string {
  return name.split(":")[0].trim();
}

/** Palette per biome: sky top, sky bottom, far ridge, near ridge, accent (pins). */
export const biomePalette: Record<Biome, { sky: [string, string]; ridges: string[]; sun: string; accent: string; water?: boolean }> = {
  coast: { sky: ["#2b5c8a", "#ffb37a"], ridges: ["#4a6a8a", "#2e4f6b", "#1c3346"], sun: "#ffd29a", accent: "#38bdf8", water: true },
  forest: { sky: ["#1f4f5a", "#f6d58e"], ridges: ["#3f6b55", "#244d3a", "#143224"], sun: "#fff0c2", accent: "#34d399" },
  desert: { sky: ["#5a2d6e", "#ff9a5c"], ridges: ["#b0603f", "#7f3f2e", "#4a2420"], sun: "#ffd56b", accent: "#fbbf24" },
  alpine: { sky: ["#1c3a73", "#ffc2a8"], ridges: ["#8fa6c4", "#4f6b94", "#24375c"], sun: "#fff4e0", accent: "#a5b4fc" },
  lake: { sky: ["#13507a", "#9fe0e8"], ridges: ["#4a7f8f", "#2a5868", "#163846"], sun: "#ffffff", accent: "#4fd1c5", water: true },
  volcanic: { sky: ["#2a1f4f", "#ff7a59"], ridges: ["#6b4a6e", "#46304e", "#24182c"], sun: "#ffb27a", accent: "#f472b6" },
};
