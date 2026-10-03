"use client";

import { useEffect, useRef } from "react";
import { reveal } from "@/lib/anim";
import { site } from "@/data/site";
import Landscape from "./Landscape";
import type { Biome } from "@/data/camping";

/** `// 0X Name` section label. */
export function SectionLabel({ id, className = "" }: { id: string; className?: string }) {
  const i = site.sections.findIndex((s) => s.id === id);
  const text = `// ${String(i + 1).padStart(2, "0")} ${site.sections[i]?.label ?? ""}`;
  return (
    <p className={`mono legible flex items-center gap-2.5 ${className}`}>
      <span className="dot" aria-hidden />
      <span className="text-[var(--fg)] opacity-80">
        {text}
      </span>
    </p>
  );
}

/** Section heading: fades up on enter; a trailing "." picks up the accent colour. */
export function Heading({ id, children, className = "" }: { id: string; children: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const tween = reveal(ref.current, ref.current);
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);
  const dot = children.endsWith(".");
  return (
    <h2 id={id} ref={ref} className={`h2 legible ${className}`}>
      {dot ? children.slice(0, -1) : children}
      {dot && <span className="accent">.</span>}
    </h2>
  );
}

export function Brackets() {
  return (
    <>
      <span className="bk tl" aria-hidden />
      <span className="bk tr" aria-hidden />
      <span className="bk bl" aria-hidden />
      <span className="bk br" aria-hidden />
    </>
  );
}

export function Crosshairs() {
  return (
    <>
      <span className="ch tl" aria-hidden>+</span>
      <span className="ch tr" aria-hidden>+</span>
      <span className="ch bl" aria-hidden>+</span>
      <span className="ch br" aria-hidden>+</span>
    </>
  );
}

/** Arrow that slides out diagonally on hover (§6.7). */
export function Arrow({ glyph = "↗" }: { glyph?: string }) {
  return (
    <span className="arrow" aria-hidden>
      <span>{glyph}</span>
      <span>{glyph}</span>
    </span>
  );
}

/** Colourful generated landscape used until a real photo is supplied. */
export function PhotoPlaceholder({ label, seed, biome }: { label: string; seed?: string; biome?: Biome }) {
  if (seed) return <Landscape seed={seed} biome={biome} label={label} />;
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#1a1e20]">
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden preserveAspectRatio="none" viewBox="0 0 100 100">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M -5 ${20 + i * 9} Q 30 ${10 + i * 9 + (i % 3) * 4}, 55 ${22 + i * 8} T 105 ${18 + i * 9}`}
            fill="none"
            stroke="#e8e6df"
            strokeOpacity="0.25"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className="mono dim relative">{label}</span>
    </div>
  );
}
