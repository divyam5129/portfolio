/**
 * Time of day along the trail. One palette per section (same order as
 * site.sections): the walk starts at dawn and ends at night by the campfire.
 * Both the 3D sky and the page's CSS accent colours read from here.
 */

export type RGB = [number, number, number];

export type Palette = {
  name: string; // shown in the HUD clock
  clock: number; // minutes since midnight, for the HUD clock
  skyTop: RGB;
  skyMid: RGB;
  horizon: RGB;
  sun: RGB; // sun (or moon) colour
  sunElevation: number; // -1..1 (negative = below horizon)
  light: number; // sun light strength on the terrain
  ambient: RGB; // fill light tint
  stars: number; // 0..1
  aurora: number; // 0..1
  accent: RGB; // UI accent
  accent2: RGB; // UI secondary accent
  glow: number; // tent + campfire glow 0..1
};

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const palettes: Palette[] = [
  {
    name: "Dawn", clock: 6 * 60 + 12,
    skyTop: hex("#171a45"), skyMid: hex("#6d3a72"), horizon: hex("#ff9a6b"),
    sun: hex("#ffb27a"), sunElevation: 0.03, light: 0.85, ambient: hex("#5a4a7a"),
    stars: 0.35, aurora: 0, accent: hex("#ff8a5b"), accent2: hex("#c084fc"), glow: 0.55,
  },
  {
    name: "Sunrise", clock: 7 * 60 + 5,
    skyTop: hex("#1b3468"), skyMid: hex("#4f6fae"), horizon: hex("#ffc98a"),
    sun: hex("#ffd59a"), sunElevation: 0.16, light: 1.05, ambient: hex("#6a7aa6"),
    stars: 0.05, aurora: 0, accent: hex("#ffb35c"), accent2: hex("#7dd3fc"), glow: 0.3,
  },
  {
    name: "Morning", clock: 9 * 60 + 30,
    skyTop: hex("#123f73"), skyMid: hex("#2f80b8"), horizon: hex("#a6dcea"),
    sun: hex("#fff1d6"), sunElevation: 0.42, light: 1.2, ambient: hex("#7fa7c9"),
    stars: 0, aurora: 0, accent: hex("#4fd1c5"), accent2: hex("#fbbf24"), glow: 0.15,
  },
  {
    name: "Midday", clock: 12 * 60 + 40,
    skyTop: hex("#0c3a6b"), skyMid: hex("#2878b0"), horizon: hex("#b4e2ec"),
    sun: hex("#fff8e8"), sunElevation: 0.7, light: 1.3, ambient: hex("#86b0cf"),
    stars: 0, aurora: 0, accent: hex("#ff6a2b"), accent2: hex("#38bdf8"), glow: 0.1,
  },
  {
    name: "Afternoon", clock: 15 * 60 + 20,
    skyTop: hex("#163c6b"), skyMid: hex("#3f74a6"), horizon: hex("#f4d6a0"),
    sun: hex("#ffe0a6"), sunElevation: 0.36, light: 1.2, ambient: hex("#8aa2bf"),
    stars: 0, aurora: 0, accent: hex("#fbbf24"), accent2: hex("#34d399"), glow: 0.15,
  },
  {
    name: "Golden hour", clock: 18 * 60 + 5,
    skyTop: hex("#2a2a63"), skyMid: hex("#a1506f"), horizon: hex("#ffb35c"),
    sun: hex("#ff9e4f"), sunElevation: 0.1, light: 1.1, ambient: hex("#8a6a8a"),
    stars: 0, aurora: 0, accent: hex("#ff9e4f"), accent2: hex("#f472b6"), glow: 0.3,
  },
  {
    name: "Sunset", clock: 19 * 60 + 18,
    skyTop: hex("#25174d"), skyMid: hex("#8c2f6c"), horizon: hex("#ff6a3d"),
    sun: hex("#ff5a36"), sunElevation: 0.015, light: 0.9, ambient: hex("#7a4a7e"),
    stars: 0.1, aurora: 0, accent: hex("#ff5f8f"), accent2: hex("#ffb35c"), glow: 0.55,
  },
  {
    name: "Dusk", clock: 20 * 60 + 2,
    skyTop: hex("#0e1034"), skyMid: hex("#3b2a6e"), horizon: hex("#c4587c"),
    sun: hex("#ff7a68"), sunElevation: -0.06, light: 0.55, ambient: hex("#4a3f7a"),
    stars: 0.55, aurora: 0.15, accent: hex("#a78bfa"), accent2: hex("#f472b6"), glow: 0.8,
  },
  {
    name: "Night", clock: 22 * 60 + 47,
    skyTop: hex("#03050e"), skyMid: hex("#0a1431"), horizon: hex("#1a2c52"),
    sun: hex("#9fb4ff"), sunElevation: -0.35, light: 0.2, ambient: hex("#1a2448"),
    stars: 1, aurora: 1, accent: hex("#5eead4"), accent2: hex("#ff8a3d"), glow: 1,
  },
];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolated palette at a fractional section position (e.g. 2.4 = 40% through section 2). */
export function paletteAt(f: number): Palette {
  const max = palettes.length - 1;
  const x = Math.min(max, Math.max(0, f));
  const i = Math.min(max - 1, Math.floor(x));
  const raw = x - i;
  // hold each palette for a while, then blend in the last part of the section
  const t = smooth(Math.min(1, Math.max(0, (raw - 0.35) / 0.65)));
  const a = palettes[i];
  const b = palettes[i + 1];
  return {
    name: t < 0.5 ? a.name : b.name,
    clock: lerp(a.clock, b.clock, raw),
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyMid: mix(a.skyMid, b.skyMid, t),
    horizon: mix(a.horizon, b.horizon, t),
    sun: mix(a.sun, b.sun, t),
    sunElevation: lerp(a.sunElevation, b.sunElevation, t),
    light: lerp(a.light, b.light, t),
    ambient: mix(a.ambient, b.ambient, t),
    stars: lerp(a.stars, b.stars, t),
    aurora: lerp(a.aurora, b.aurora, t),
    accent: mix(a.accent, b.accent, t),
    accent2: mix(a.accent2, b.accent2, t),
    glow: lerp(a.glow, b.glow, t),
  };
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function rgbCss([r, g, b]: RGB, alpha = 1) {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return alpha === 1 ? `rgb(${c(r)} ${c(g)} ${c(b)})` : `rgb(${c(r)} ${c(g)} ${c(b)} / ${alpha})`;
}

export function formatClock(minutes: number) {
  const m = Math.round(minutes) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
