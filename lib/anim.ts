"use client";

import { gsap, scrollStore } from "./gsap";

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
