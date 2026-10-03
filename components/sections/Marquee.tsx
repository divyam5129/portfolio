"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";

/**
 * Infinite text band. Drifts on its own, speeds up and skews with scroll
 * velocity, and reverses with scroll direction.
 */
export default function Marquee({ words, reverse = false, tone = "accent" }: { words: string[]; reverse?: boolean; tone?: "accent" | "glass" }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (scrollStore.reducedMotion) return;
      const el = track.current!;
      const half = () => el.scrollWidth / 2;
      let x = 0;
      let dir = reverse ? 1 : -1;
      let skew = 0;
      const setX = gsap.quickSetter(el, "x", "px");
      const setSkew = gsap.quickSetter(el, "skewX", "deg");
      const tick = () => {
        const v = scrollStore.velocity || 0;
        if (Math.abs(v) > 0.5) dir = (v > 0 ? -1 : 1) * (reverse ? -1 : 1);
        const speed = 0.6 + Math.min(14, Math.abs(v) * 0.35);
        x += dir * speed * gsap.ticker.deltaRatio();
        const w = half();
        if (w > 0) {
          if (x <= -w) x += w;
          if (x > 0) x -= w;
        }
        skew += (Math.max(-12, Math.min(12, -v * 0.25)) - skew) * 0.1;
        setX(x);
        setSkew(skew);
        scrollStore.velocity *= 0.92;
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root },
  );

  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {words.map((w, i) => (
        <span key={`${key}${i}`} className="flex items-center">
          <span className="whitespace-nowrap px-6 text-[clamp(2.2rem,6vw,5rem)] font-semibold uppercase leading-none tracking-[-0.03em] md:px-10">
            {w}
          </span>
          <span
            className="text-[clamp(1.4rem,3vw,2.4rem)]"
            style={{ color: tone === "accent" ? "rgba(11,13,14,0.55)" : i % 2 ? "var(--accent-2)" : "var(--accent)" }}
          >
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={root}
      className={`relative overflow-hidden py-6 md:py-8 ${tone === "accent" ? "text-[#0b0d0e]" : "glass border-x-0 text-[var(--fg)]"}`}
      style={tone === "accent" ? { background: "linear-gradient(100deg, var(--accent), var(--accent-2))" } : undefined}
      role="marquee"
      aria-label={words.join(", ")}
    >
      <div ref={track} className="marquee">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
