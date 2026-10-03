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
 * Per-frame values shared between DOM and the 3D scene.
 * Mutated in place; never put these in React state.
 */
export const scrollStore = {
  /** 0–1 over the whole page */
  progress: 0,
  /** smoothed copy used by the camera */
  eased: 0,
  velocity: 0,
  /** index into site.sections */
  section: 0,
  /** -1..1 normalised pointer */
  pointer: { x: 0, y: 0 },
  /** 0..1 how much the 2D map has taken over (terrain fades) */
  mapBlend: 0,
  /** 0..1 experience progress (drives the camera along its path) */
  experience: 0,
  /** interpolated time-of-day palette for the current scroll position */
  palette: paletteAt(0) as Palette,
  /** tab visible + hero visible flags for frameloop control */
  visible: true,
  // read at module load: section layout effects run before any provider effect
  reducedMotion:
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};
