// Camping trips for the Trail Map and Gallery.
// Trips are drawn in chronological order of `date` (YYYY-MM) once every trip has one.

export type Trip = {
  id: string;
  name: string; // "Yosemite Valley" or "Yosemite Valley: Upper Pines"
  /** Park / area shown on the trip card. */
  area: string;
  lat: number;
  lng: number;
  /** Elevation of the campsite area, feet. */
  elevationFt: number;
  date?: string; // "2025-08"; leave out (TODO) until known
  blurb: string; // 1–2 lines
  photos: string[]; // paths in /public/photos; empty = generated placeholder art
  nights?: number;
  /** Colour family for the pin and placeholder art. */
  biome?: Biome;
};

export type Biome = "coast" | "forest" | "desert" | "alpine" | "lake" | "volcanic";

export const campingConfig: {
  /** Optional total trail miles. Leave undefined to render "—". */
  miles?: number;
} = {
  miles: undefined, // TODO: add if you track it
};

/**
 * Real trips. Blurbs describe the places themselves; swap in your own words any time.
 * TODO: add `date` ("YYYY-MM"), `nights`, the campground name (e.g. "Yosemite Valley: Upper Pines")
 * and photos for each. Order here is the order the route is drawn until every trip has a date.
 */
export const trips: Trip[] = [
  {
    id: "yosemite-valley",
    name: "Yosemite Valley",
    area: "Yosemite National Park",
    lat: 37.7398,
    lng: -119.5661,
    elevationFt: 4000,
    blurb: "The valley floor between El Capitan and Half Dome, with the Merced River running through it.",
    photos: [],
    biome: "alpine",
  },
  {
    id: "tuolumne",
    name: "Tuolumne Meadows",
    area: "Yosemite National Park · Tioga Road",
    lat: 37.8743,
    lng: -119.3583,
    elevationFt: 8600,
    blurb: "High-country meadow on Tioga Road, ringed by granite domes and the peaks of the Cathedral Range.",
    photos: [],
    biome: "forest",
  },
  {
    // TODO: move the pin to the actual campground (it sits on the lake for now)
    id: "tahoe",
    name: "Lake Tahoe",
    area: "Sierra Nevada · California–Nevada line",
    lat: 39.09,
    lng: -120.04,
    elevationFt: 6225,
    blurb: "The largest alpine lake in North America, straddling the California–Nevada line.",
    photos: [],
    biome: "lake",
  },
];

/** Chronological once every trip has a date; otherwise the order above. */
export const tripsChronological = trips.every((t) => t.date)
  ? [...trips].sort((a, b) => a.date!.localeCompare(b.date!))
  : trips;

export function formatTripDate(date?: string): string {
  if (!date) return "—";
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
