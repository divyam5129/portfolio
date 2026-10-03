"use client";

import { useMemo } from "react";

/**
 * 2D fallback for weak devices / no WebGL / pre-JS paint: a layered
 * mountain landscape whose sky and ridges take the time-of-day colours from
 * CSS variables, so it shifts from dawn to night as you scroll.
 */
function ridgePath(seed: number, base: number, amp: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const f1 = 1.2 + rnd() * 1.5;
  const f2 = 3.5 + rnd() * 4;
  const p1 = rnd() * 6.28;
  const p2 = rnd() * 6.28;
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const y = base - amp * (0.6 * Math.sin(t * f1 * Math.PI + p1) + 0.3 * Math.sin(t * f2 * Math.PI + p2) + 0.1 * Math.sin(t * 23 + p1));
    pts.push(`${(t * 1600).toFixed(0)},${y.toFixed(1)}`);
  }
  return `M0,1000 L${pts.join(" L")} L1600,1000 Z`;
}

export default function ContourFallback() {
  const layers = useMemo(
    () => [
      { d: ridgePath(11, 520, 110), mix: 55 },
      { d: ridgePath(23, 610, 90), mix: 72 },
      { d: ridgePath(37, 700, 80), mix: 84 },
      { d: ridgePath(51, 800, 70), mix: 93 },
    ],
    [],
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(to bottom, var(--sky-top), var(--sky-mid) 45%, var(--horizon) 72%)" }}
    >
      <div
        className="absolute left-[62%] top-[38%] h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--horizon) 70%, white) 0 8%, color-mix(in oklab, var(--horizon) 60%, transparent) 9%, transparent 65%)" }}
      />
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
        style={{ animation: "contour-drift 40s ease-in-out infinite alternate" }}
      >
        {layers.map((l, i) => (
          <path
            key={i}
            d={l.d}
            style={{ fill: `color-mix(in oklab, var(--sky-mid) ${100 - l.mix}%, #0a0d16)` }}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
