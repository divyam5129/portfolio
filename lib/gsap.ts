"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { paletteAt, type Palette } from "./timeOfDay";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText, Flip);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
  registered = true;
}

registerGsap();

export { gsap, ScrollTrigger, DrawSVGPlugin, SplitText, Flip };

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
  /** 0..1 experience progress (lights trail posts) */
  experience: 0,
  /** interpolated time-of-day palette for the current scroll position */
  palette: paletteAt(0) as Palette,
  /** tab visible + hero visible flags for frameloop control */
  visible: true,
  // read at module load: section layout effects run before any provider effect
  reducedMotion:
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

/** Scramble recipe (§7.1): random glyphs resolving left → right over ~400ms. */
const GLYPHS = "!<>-_\\/[]{}—=+*^?#";

export function scrambleText(
  el: HTMLElement,
  finalText: string,
  { duration = 0.4, delay = 0 }: { duration?: number; delay?: number } = {},
) {
  if (scrollStore.reducedMotion) {
    el.textContent = finalText;
    return gsap.to({}, { duration: 0 });
  }
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration,
    delay,
    ease: "none",
    onUpdate() {
      const resolved = Math.floor(state.p * finalText.length);
      let out = finalText.slice(0, resolved);
      for (let i = resolved; i < finalText.length; i++) {
        const ch = finalText[i];
        out += ch === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete() {
      el.textContent = finalText;
    },
  });
}
