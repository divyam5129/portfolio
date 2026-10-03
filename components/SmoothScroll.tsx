"use client";

import { useEffect } from "react";
import { initLenis } from "@/lib/lenis";
import { gsap, ScrollTrigger, scrollStore } from "@/lib/gsap";
import { getPrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { measureStops, sectionPhase, sectionStops } from "@/lib/sections";
import { paletteAt, rgbCss } from "@/lib/timeOfDay";

export const SECTION_EVENT = "trail:section";
export { sectionStops };

/**
 * Global scroll wiring: Lenis, section tracking, the eased progress value,
 * and the time-of-day palette (written to the store for the 3D scene and to
 * CSS variables for the page).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = getPrefersReducedMotion();
    scrollStore.reducedMotion = reduced;
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";

    const cleanupLenis = initLenis(reduced);

    const onRefresh = () => measureStops();
    ScrollTrigger.addEventListener("refresh", onRefresh);
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    const root = document.documentElement.style;
    let lastCss = "";
    let first = true;

    const tick = () => {
      // eased progress (frame-rate independent, ≈0.08 per 60fps frame)
      const k = reduced || first ? 1 : 1 - Math.pow(1 - 0.08, gsap.ticker.deltaRatio());
      scrollStore.eased += (scrollStore.progress - scrollStore.eased) * k;
      first = false;

      // current section: becomes current once its top passes ~55% of the viewport
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) {
        const probe = (window.scrollY + window.innerHeight * 0.45) / max;
        let i = 0;
        for (let s = sectionStops.length - 1; s >= 0; s--) {
          if (probe >= sectionStops[s]) {
            i = s;
            break;
          }
        }
        if (i !== scrollStore.section) {
          scrollStore.section = i;
          window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: i }));
        }
      }

      // time of day
      const { section, local } = sectionPhase(scrollStore.eased);
      const pal = paletteAt(section + local);
      scrollStore.palette = pal;
      const css = `${rgbCss(pal.accent)}|${rgbCss(pal.accent2)}|${rgbCss(pal.skyTop)}|${rgbCss(pal.skyMid)}|${rgbCss(pal.horizon)}`;
      if (css !== lastCss) {
        lastCss = css;
        const [a, b, top, mid, hor] = css.split("|");
        root.setProperty("--accent", a);
        root.setProperty("--accent-2", b);
        root.setProperty("--sky-top", top);
        root.setProperty("--sky-mid", mid);
        root.setProperty("--horizon", hor);
      }
    };
    gsap.ticker.add(tick);

    const onPointer = (e: PointerEvent) => {
      scrollStore.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scrollStore.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onVisibility = () => {
      scrollStore.visible = document.visibilityState === "visible";
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Fonts change line breaks (and therefore pin lengths).
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.clearTimeout(t);
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      cleanupLenis();
    };
  }, []);

  return null;
}
