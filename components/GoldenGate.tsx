"use client";

import { forwardRef, useMemo } from "react";

/**
 * Line drawing of the Golden Gate Bridge, built for DrawSVG: every stroke has a
 * class so the hero timeline can draw it on in order (water → headlands →
 * towers → deck → cables → suspenders). Pure SVG, no image needed.
 */
export const VB = { w: 1600, h: 700 };
const DECK = 470;
const WATER = 556;
const TOWERS = [470, 1130];
const TOP = 92;

// main cable: three quadratic spans (side, main, side)
const SPANS: [number, number, number, number, number, number][] = [
  [150, DECK - 6, 320, 330, TOWERS[0], TOP + 4],
  [TOWERS[0], TOP + 4, 800, 818, TOWERS[1], TOP + 4],
  [TOWERS[1], TOP + 4, 1280, 330, 1450, DECK - 6],
];

function quad(t: number, a: number, b: number, c: number) {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}

/** y of the cable at x (solves each quadratic span numerically). */
function cableY(x: number) {
  for (const [x0, y0, cx, cy, x1, y1] of SPANS) {
    if (x < x0 || x > x1) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (quad(mid, x0, cx, x1) < x) lo = mid;
      else hi = mid;
    }
    return quad(lo, y0, cy, y1);
  }
  return DECK;
}

function tower(x: number) {
  // two legs that step in as they rise, joined by portal struts
  const legs: string[] = [];
  for (const side of [-1, 1]) {
    const outer = x + side * 26;
    const inner = x + side * 11;
    const step1 = x + side * 24;
    const step2 = x + side * 22;
    legs.push(
      `M${outer},${WATER} L${outer},300 L${step1},300 L${step1},190 L${step2},190 L${step2},${TOP} ` +
        `L${inner},${TOP} L${inner},${WATER}`,
    );
  }
  const struts = [TOP + 18, 170, 250, 335, DECK + 30].map((y, i) => {
    const h = i === 4 ? 16 : 10;
    return `M${x - 11},${y} L${x + 11},${y} L${x + 11},${y + h} L${x - 11},${y + h} Z`;
  });
  const pier = `M${x - 36},${WATER - 8} L${x + 36},${WATER - 8} L${x + 36},${WATER + 18} L${x - 36},${WATER + 18} Z`;
  return { legs, struts, pier };
}

const GoldenGate = forwardRef<SVGSVGElement, { className?: string }>(function GoldenGate({ className = "" }, ref) {
  const g = useMemo(() => {
    const suspenders: string[] = [];
    for (let x = 160; x <= 1440; x += 15) {
      if (TOWERS.some((t) => Math.abs(x - t) < 32)) continue;
      const y = cableY(x);
      if (DECK - y < 6) continue;
      suspenders.push(`M${x},${y.toFixed(1)} L${x},${DECK - 1}`);
    }
    const cable = SPANS.map(([x0, y0, cx, cy, x1, y1], i) => `${i === 0 ? `M${x0},${y0}` : ""} Q${cx},${cy} ${x1},${y1}`).join(" ");
    const truss: string[] = [];
    for (let x = 90; x < 1510; x += 22) truss.push(`M${x},${DECK} L${x + 11},${DECK + 14} L${x + 22},${DECK}`);
    const waves = [
      { y: 584, x0: 40, x1: 760, a: 3 },
      { y: 590, x0: 860, x1: 1560, a: 3 },
      { y: 616, x0: 160, x1: 1040, a: 4 },
      { y: 622, x0: 1120, x1: 1500, a: 3 },
      { y: 652, x0: 60, x1: 620, a: 4 },
      { y: 658, x0: 720, x1: 1420, a: 5 },
      { y: 688, x0: 260, x1: 1200, a: 5 },
    ].map(({ y, x0, x1, a }) => {
      let d = `M${x0},${y}`;
      for (let x = x0; x < x1; x += 24) d += ` q6,${-a} 12,0 t12,0`;
      return d;
    });
    return { suspenders, cable, truss, waves, towers: TOWERS.map(tower) };
  }, []);

  return (
    <svg ref={ref} viewBox={`0 0 ${VB.w} ${VB.h}`} className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gg-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0d18" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b0d18" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="gg-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0d18" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="#0b0d18" stopOpacity="0.3" />
          <stop offset="1" stopColor="#0b0d18" stopOpacity="0" />
        </linearGradient>
        <filter id="gg-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gg-blur">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* sun ring behind the south tower */}
      <circle className="gg-sun" cx="1262" cy="250" r="78" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle className="gg-sun" cx="1262" cy="250" r="104" stroke="var(--accent)" strokeOpacity="0.22" strokeWidth="1" />

      {/* water */}
      <rect className="gg-fill" x="0" y={WATER} width={VB.w} height={VB.h - WATER} fill="url(#gg-water)" />
      <g className="gg-waves" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4">
        {g.waves.map((d, i) => (
          <path key={i} className="gg-wave" d={d} />
        ))}
      </g>

      {/* a container ship far out, and a sailboat closer in (they pass under the bridge once it's drawn) */}
      <g className="gg-ship" opacity="0" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2">
        <path d="M0,572 L118,572 L111,580 L5,580 Z" fill="#0b0d18" />
        <path d="M9,572 L9,564 L29,564 L29,572 M31,572 L31,561 L51,561 L51,572 M53,572 L53,565 L73,565 L73,572 M75,572 L75,562 L95,562 L95,572" strokeOpacity="0.5" />
        <path d="M100,572 L100,556 L111,556 L111,572" />
        <circle cx="105" cy="553" r="1.4" fill="#fff4d6" stroke="none" />
      </g>
      <g className="gg-boat" opacity="0" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.3">
        <path d="M0,640 L46,640 L38,650 L8,650 Z" fill="#0b0d18" />
        <path d="M22,640 L22,584" />
        <path d="M24,588 L24,636 L50,636 Z" fill="#ffffff" fillOpacity="0.12" />
        <path d="M20,592 L4,632 L20,632 Z" fill="#ffffff" fillOpacity="0.08" strokeOpacity="0.6" />
      </g>

      {/* headlands: Marin (left) and the city side (right) */}
      <path
        className="gg-land gg-fillable"
        d={`M0,${WATER} L0,392 C46,330 118,296 182,322 C238,346 276,418 332,470 C352,490 372,520 392,${WATER} Z`}
        fill="url(#gg-land)"
        fillOpacity="0"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.6"
      />
      <path
        className="gg-land gg-fillable"
        d={`M${VB.w},${WATER} L${VB.w},430 C1556,418 1500,440 1462,468 C1436,488 1420,520 1404,${WATER} Z`}
        fill="url(#gg-land)"
        fillOpacity="0"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="1.6"
      />
      {/* contour hints on the headlands */}
      <g stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1">
        <path className="gg-land" d="M20,420 C70,370 130,350 180,366 C220,380 250,420 280,452" />
        <path className="gg-land" d="M30,470 C80,430 140,420 190,430 C230,440 260,470 290,500" />
        <path className="gg-land" d="M1590,470 C1540,462 1490,480 1460,506" />
      </g>

      {/* fog wisps drifting under the deck */}
      <g className="gg-fog" filter="url(#gg-blur)" fill="#ffffff">
        <ellipse className="gg-wisp" cx="380" cy="540" rx="220" ry="26" fillOpacity="0.22" />
        <ellipse className="gg-wisp" cx="900" cy="548" rx="300" ry="30" fillOpacity="0.2" />
        <ellipse className="gg-wisp" cx="1340" cy="536" rx="200" ry="24" fillOpacity="0.18" />
      </g>

      {/* towers */}
      <g className="gg-towers" stroke="#ff5a36" strokeWidth="2.6" filter="url(#gg-glow)">
        {g.towers.map((t, i) => (
          <g key={i}>
            {t.legs.map((d, k) => (
              <path key={k} className="gg-tower" d={d} />
            ))}
            {t.struts.map((d, k) => (
              <path key={`s${k}`} className="gg-tower" d={d} />
            ))}
            <path className="gg-tower" d={t.pier} stroke="#d9d4cc" strokeWidth="1.6" />
          </g>
        ))}
      </g>

      {/* deck + truss */}
      <g stroke="#ffd7c2" strokeWidth="2">
        <path className="gg-deck" d={`M90,${DECK} L1510,${DECK}`} />
        <path className="gg-deck" d={`M90,${DECK + 14} L1510,${DECK + 14}`} />
      </g>
      <g stroke="#ff7a52" strokeOpacity="0.55" strokeWidth="1">
        {g.truss.map((d, i) => (
          <path key={i} className="gg-truss" d={d} />
        ))}
      </g>

      {/* main cable */}
      <path className="gg-cable" d={g.cable} stroke="#ff5a36" strokeWidth="3" filter="url(#gg-glow)" />

      {/* suspenders */}
      <g stroke="#ff8a66" strokeOpacity="0.7" strokeWidth="1">
        {g.suspenders.map((d, i) => (
          <path key={i} className="gg-sus" d={d} />
        ))}
      </g>

      {/* cars: light dots travelling along the deck */}
      <g className="gg-cars">
        <circle className="gg-car" cx="90" cy={DECK - 4} r="3" fill="#fff4d6" filter="url(#gg-glow)" opacity="0" />
        <circle className="gg-car" cx="90" cy={DECK - 4} r="3" fill="#ff4d3d" filter="url(#gg-glow)" opacity="0" />
        <circle className="gg-car" cx="90" cy={DECK - 4} r="2.6" fill="#fff4d6" filter="url(#gg-glow)" opacity="0" />
      </g>

      {/* gulls */}
      <g stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.6">
        <path className="gg-bird" d="M760,150 q10,-9 20,0 q10,-9 20,0" />
        <path className="gg-bird" d="M820,128 q7,-6 14,0 q7,-6 14,0" />
        <path className="gg-bird" d="M720,176 q6,-5 12,0 q6,-5 12,0" />
      </g>
    </svg>
  );
});

export default GoldenGate;
