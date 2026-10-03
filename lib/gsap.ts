"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { paletteAt, type Palette } from "./timeOfDay";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
  registered = true;
}

registerGsap();

export { gsap, ScrollTrigger, DrawSVGPlugin };

/**
 * Per-frame values shared across the page.
 * Mutated in place; never put these in React state.
 */
export const scrollStore = {
  /** 0–1 over the whole page */
  progress: 0,
  /** smoothed copy (drives the time of day) */
  eased: 0,
  velocity: 0,
  /** index into site.sections */
  section: 0,
  /** interpolated time-of-day palette for the current scroll position */
  palette: paletteAt(0) as Palette,
  // read at module load: section layout effects run before any provider effect
  reducedMotion:
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};
