"use client";

import { gsap, ScrollTrigger, scrollStore } from "./gsap";

/* ---------- intro handshake ---------- */
let introReady = false;
const INTRO_EVENT = "trail:intro-ready";

/** Fire once fonts are in (capped, so a slow font never holds up the page). */
export function startIntro() {
  if (introReady) return;
  const go = () => {
    if (introReady) return;
    introReady = true;
    window.dispatchEvent(new Event(INTRO_EVENT));
  };
  document.fonts?.ready.then(go);
  window.setTimeout(go, 600);
}

/** Run `cb` when the hero intro should play (immediately if it already has). */
export function onIntro(cb: () => void) {
  if (introReady) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(INTRO_EVENT, handler, { once: true });
  return () => window.removeEventListener(INTRO_EVENT, handler);
}

/* ---------- the one entrance used site-wide ---------- */
/** Quiet fade-up as `trigger` scrolls into view. Opacity only under reduced motion. */
export function reveal(targets: gsap.TweenTarget, trigger: Element | string, { stagger = 0.06 }: { stagger?: number } = {}) {
  return gsap.from(targets, {
    autoAlpha: 0,
    y: scrollStore.reducedMotion ? 0 : 16,
    duration: 0.7,
    stagger,
    ease: "power2.out",
    scrollTrigger: { trigger, start: "top 88%", once: true },
  });
}

/* ---------- Bay Area line art ---------- */
/**
 * Draw an illustration's `.la-draw` strokes as it scrolls into view (scrubbed, so
 * scrolling back un-draws it) so it completes as it becomes fully visible, fade in its
 * `.la-fill` shapes at the end, and call `onDrawn` then so it can start its ambient life.
 */
export function drawLineArt(svg: SVGSVGElement, onDrawn?: () => void) {
  const strokes = svg.querySelectorAll(".la-draw");
  const fills = svg.querySelectorAll(".la-fill");
  if (scrollStore.reducedMotion) {
    onDrawn?.();
    return;
  }
  const tl = gsap.timeline({
    scrollTrigger: { trigger: svg, start: "top 95%", end: "bottom bottom", scrub: 0.8 },
  });
  tl.fromTo(strokes, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1, stagger: { amount: 1.2 }, ease: "none" }, 0);
  if (fills.length) tl.fromTo(fills, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "none" }, 1.5);
  if (onDrawn) ScrollTrigger.create({ trigger: svg, start: "bottom bottom", once: true, onEnter: onDrawn });
}

/** Seeded random, so generated windows/details are identical on server and client. */
export function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ---------- hairline draw ---------- */
export function hairlines(scope: Element) {
  const lines = scope.querySelectorAll<HTMLElement>("[data-hairline]");
  lines.forEach((line) => {
    const axis = line.dataset.hairline === "y" ? "scaleY" : "scaleX";
    gsap.from(line, {
      [axis]: 0,
      duration: 1.1,
      ease: "power2.inOut",
      scrollTrigger: { trigger: line, start: "top 92%", once: true },
    });
  });
}
