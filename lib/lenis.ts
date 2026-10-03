"use client";

import Lenis from "lenis";
import { gsap, ScrollTrigger, scrollStore } from "./gsap";

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/** Create Lenis driven by gsap.ticker. Returns a cleanup fn. */
export function initLenis(reducedMotion: boolean) {
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollStore.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  if (reducedMotion) {
    // Native scrolling only; still feed the progress store.
    const onScroll = () => {
      updateProgress();
      ScrollTrigger.update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", onScroll);
  }

  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on("scroll", (e: Lenis) => {
    scrollStore.velocity = e.velocity;
    updateProgress();
    ScrollTrigger.update();
  });

  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  updateProgress();

  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/** Smooth scroll anywhere; falls back to native when Lenis is off. */
export function scrollToTarget(target: string | number | HTMLElement, duration = 1.6) {
  if (lenis) {
    lenis.scrollTo(target, {
      duration,
      easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    });
    return;
  }
  if (typeof target === "number") window.scrollTo({ top: target });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView();
  }
}
