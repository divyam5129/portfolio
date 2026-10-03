"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { markLoaderDone } from "@/lib/anim";
import { loadTarget, setLoad } from "@/lib/loadStore";
import { getLenis } from "@/lib/lenis";

const SEED = "---===+++=---===+++=---===+++=";
// dawn → night, the same journey as the page
const LOADER_COLORS = ["#ff8a5b", "#ffb35c", "#fbbf24", "#4fd1c5", "#38bdf8", "#a78bfa", "#f472b6", "#5eead4"];
const MIN_MS = 1200;
const MAX_MS = 3000;
export const LOADER_SEEN_KEY = "trail:loader-seen";

/**
 * §4.1 Loader. Server-rendered so it covers the first paint; an inline
 * script in <head> adds `html.skip-loader` for repeat visits / reduced motion,
 * and <noscript> hides it entirely.
 */
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const ascii = useRef<HTMLParagraphElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(LOADER_SEEN_KEY) === "1";
    } catch {}

    document.fonts?.ready.then(() => setLoad({ fonts: true }));

    if (seen || html.classList.contains("skip-loader")) {
      if (root.current) root.current.style.display = "none";
      markLoaderDone();
      return;
    }

    getLenis()?.stop();
    const start = performance.now();
    let text = SEED;
    const shown = { v: 0 };
    let finished = false;

    // ASCII frames: shift characters left every ~80ms.
    const asciiTimer = window.setInterval(() => {
      text = text.slice(1) + text[0];
      const spans = ascii.current?.children;
      if (spans) for (let i = 0; i < spans.length; i++) spans[i].textContent = text[i];
    }, 80);

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(asciiTimer);
      try {
        sessionStorage.setItem(LOADER_SEEN_KEY, "1");
      } catch {}
      if (counter.current) counter.current.textContent = "100";

      const done = () => {
        getLenis()?.start();
        if (root.current) root.current.style.display = "none";
      };

      if (reduced) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.5, onComplete: done });
        markLoaderDone();
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to([ascii.current, counter.current], {
        letterSpacing: 0,
        autoAlpha: 0,
        duration: 0.45,
        ease: "power2.in",
      })
        .set(root.current, { backgroundColor: "transparent" })
        .to(top.current, { yPercent: -100, duration: 0.9, ease: "power4.inOut" })
        .to(bottom.current, { yPercent: 100, duration: 0.9, ease: "power4.inOut" }, "<")
        .call(markLoaderDone, [], "<0.35");
    };

    const tick = () => {
      const elapsed = performance.now() - start;
      const target = loadTarget();
      // Counter chases the real target but never outruns the minimum display time.
      const timeCap = Math.min(100, (elapsed / MIN_MS) * 100);
      const goal = Math.min(target, timeCap);
      shown.v += (goal - shown.v) * 0.12;
      if (goal - shown.v < 0.6) shown.v = goal;
      if (counter.current) counter.current.textContent = String(Math.round(shown.v)).padStart(2, "0");

      if ((shown.v >= 99.5 && elapsed >= MIN_MS) || elapsed >= MAX_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(asciiTimer);
    };
  }, []);

  return (
    <div ref={root} id="loader" className="fixed inset-0 z-[100] bg-[var(--bg)]" role="status" aria-label="Loading">
      <div ref={top} className="absolute inset-x-0 top-0 h-1/2 bg-[var(--bg)]" />
      <div ref={bottom} className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--bg)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p ref={ascii} aria-hidden className="font-mono text-[13px] tracking-[0.35em] md:text-[15px]">
            {SEED.split("").map((ch, i) => (
              <span key={i} style={{ color: LOADER_COLORS[Math.floor((i / SEED.length) * LOADER_COLORS.length)] }}>
                {ch}
              </span>
            ))}
          </p>
          <p ref={counter} className="mono dim mt-4 tabular-nums">
            00
          </p>
        </div>
      </div>
    </div>
  );
}
