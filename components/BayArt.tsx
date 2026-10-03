"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, scrollStore } from "@/lib/gsap";
import { drawLineArt, seeded } from "@/lib/anim";

/*
 * Bay Area line illustrations in the same hand as the hero's Golden Gate.
 * Strokes marked `.la-draw` draw themselves on scroll; `.la-win` windows switch
 * on once drawn; each piece adds a little ambient life of its own.
 */

const LINE = "#f3f1ea";

type Box = { x: number; w: number; top: number };

/** Lit-window grid for a rectangular building. */
function windows(b: Box, ground: number, rnd: () => number, gapX = 14, gapY = 18) {
  const out: { x: number; y: number }[] = [];
  for (let y = b.top + 14; y < ground - 18; y += gapY)
    for (let x = b.x + 8; x < b.x + b.w - 10; x += gapX) if (rnd() > 0.55) out.push({ x, y });
  return out;
}

function boxPath(b: Box, ground: number) {
  return `M${b.x},${ground} L${b.x},${b.top} L${b.x + b.w},${b.top} L${b.x + b.w},${ground}`;
}

/** Switch windows on in a random order, then let a few flicker now and then. */
function lightWindows(svg: SVGSVGElement, max = 0.85) {
  const wins = gsap.utils.toArray<SVGElement>(svg.querySelectorAll(".la-win"));
  if (!wins.length) return;
  if (scrollStore.reducedMotion) {
    gsap.set(wins, { opacity: max * 0.8 });
    return;
  }
  gsap.to(wins, { opacity: () => max * (0.45 + Math.random() * 0.55), duration: 0.5, stagger: { each: 0.012, from: "random" } });
  gsap.to(gsap.utils.shuffle(wins.slice()).slice(0, Math.ceil(wins.length * 0.08)), {
    opacity: 0.08,
    duration: 0.4,
    repeat: -1,
    yoyo: true,
    repeatDelay: 5,
    delay: () => 2 + Math.random() * 6,
    stagger: { each: 0.7, from: "random" },
  });
}

/* ------------------------------------------------------------------ */
/* San José: downtown towers, City Hall's dome, palms, a light-rail train */
/* ------------------------------------------------------------------ */

export function SanJoseSkyline({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const G = 310;
  const art = useMemo(() => {
    const rnd = seeded(7);
    const boxes: Box[] = [
      { x: 40, w: 70, top: 200 },
      { x: 120, w: 54, top: 160 },
      { x: 186, w: 80, top: 214 },
      { x: 520, w: 62, top: 150 },
      { x: 1050, w: 82, top: 140 },
      { x: 1142, w: 60, top: 190 },
      { x: 1350, w: 74, top: 170 },
      { x: 1434, w: 96, top: 210 },
      { x: 1540, w: 50, top: 180 },
    ];
    // three stepped towers
    const steps = [0, 1, 2].map((k) => {
      const x = 310 + k * 70;
      const top = 96 + k * 22;
      return { x, w: 58, top, d: `M${x},${G} L${x},${top + 24} L${x + 8},${top + 24} L${x + 8},${top} L${x + 50},${top} L${x + 50},${top + 24} L${x + 58},${top + 24} L${x + 58},${G}` };
    });
    // City Hall: slab tower with a fin, and the glass rotunda
    const hallTower: Box = { x: 760, w: 92, top: 70 };
    const dome = { cx: 935, r: 72 };
    const ribs = [-48, -24, 0, 24, 48].map((dx) => `M${dome.cx + dx},${G} Q${dome.cx + dx * 0.55},${G - dome.r * 0.95} ${dome.cx},${G - dome.r}`);
    // a slender tower with a slanted crown
    const slant = { x: 1222, w: 104, top: 96 };
    const palms = [250, 690, 1015, 1300, 1600 - 92].map((x, i) => {
      const h = 96 + (i % 3) * 18;
      const lean = i % 2 ? 7 : -6;
      const tx = x + lean;
      const ty = G - h;
      const fronds = [-1, -0.45, 0.1, 0.6, 1].map((s) => `M${tx},${ty} q${s * 18},${-14 + Math.abs(s) * 6} ${s * 38},${4 + Math.abs(s) * 12}`);
      return { trunk: `M${x},${G} Q${x + lean * 0.3},${G - h * 0.55} ${tx},${ty}`, fronds };
    });
    const allBoxes = [...boxes, hallTower, { x: slant.x, w: slant.w, top: slant.top + 20 }, ...steps.map((s) => ({ x: s.x, w: s.w, top: s.top + 24 }))];
    const wins = allBoxes.flatMap((b) => windows(b, G, rnd));
    return { boxes, steps, hallTower, dome, ribs, slant, palms, wins };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      drawLineArt(el, () => {
        lightWindows(el, 0.7);
        if (scrollStore.reducedMotion) return;
        // light-rail train glides across now and then
        gsap.fromTo(".la-train", { x: -220 }, { x: 1820, duration: 16, ease: "none", repeat: -1, repeatDelay: 5 });
      });
    },
    { scope: svg },
  );

  return (
    <svg ref={svg} viewBox="0 0 1600 340" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke={LINE} strokeOpacity="0.55" strokeWidth="1.4">
        {art.boxes.map((b, i) => (
          <path key={i} className="la-draw" d={boxPath(b, G)} />
        ))}
        {art.steps.map((s, i) => (
          <path key={`s${i}`} className="la-draw" d={s.d} />
        ))}
        <path className="la-draw" d={boxPath(art.hallTower, G)} />
        <path className="la-draw" d={`M${art.hallTower.x - 10},${art.hallTower.top + 26} L${art.hallTower.x + art.hallTower.w + 10},${art.hallTower.top + 26}`} />
        <path className="la-draw" d={`M${art.slant.x},${G} L${art.slant.x},${art.slant.top + 30} L${art.slant.x + art.slant.w},${art.slant.top} L${art.slant.x + art.slant.w},${G}`} />
      </g>
      {/* City Hall rotunda */}
      <g stroke="var(--accent)" strokeOpacity="0.75" strokeWidth="1.5">
        <path className="la-draw" d={`M${art.dome.cx - art.dome.r},${G} A${art.dome.r},${art.dome.r} 0 0 1 ${art.dome.cx + art.dome.r},${G}`} />
        {art.ribs.map((d, i) => (
          <path key={i} className="la-draw" d={d} strokeOpacity="0.45" strokeWidth="1" />
        ))}
      </g>
      {/* palms */}
      <g stroke={LINE} strokeOpacity="0.6" strokeWidth="1.3">
        {art.palms.map((p, i) => (
          <g key={i}>
            <path className="la-draw" d={p.trunk} />
            {p.fronds.map((d, k) => (
              <path key={k} className="la-draw" d={d} />
            ))}
          </g>
        ))}
      </g>
      {/* windows */}
      <g fill="var(--accent)">
        {art.wins.map((w, i) => (
          <rect key={i} className="la-win" x={w.x} y={w.y} width="5" height="7" opacity="0" />
        ))}
      </g>
      {/* ground, rail, train */}
      <path className="la-draw" d={`M0,${G} L1600,${G}`} stroke={LINE} strokeOpacity="0.7" strokeWidth="1.4" />
      <path className="la-draw" d={`M0,${G + 12} L1600,${G + 12}`} stroke={LINE} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 6" />
      <g className="la-train" transform="translate(-220 0)">
        <rect x="0" y={G - 18} width="170" height="16" rx="5" stroke={LINE} strokeOpacity="0.8" strokeWidth="1.2" fill="#0b0e1c" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={10 + i * 17} y={G - 14} width="10" height="6" rx="1" fill="#fff4d6" fillOpacity="0.85" />
        ))}
        <circle cx="166" cy={G - 9} r="2.4" fill="#fff4d6" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* San Francisco's financial district from the bay                     */
/* ------------------------------------------------------------------ */

export function FinancialDistrict({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const G = 400;
  const art = useMemo(() => {
    const rnd = seeded(23);
    const boxes: Box[] = [
      { x: 430, w: 74, top: 250 },
      { x: 512, w: 58, top: 190 },
      { x: 676, w: 82, top: 226 },
      { x: 862, w: 58, top: 168 },
      { x: 1140, w: 66, top: 206 },
      { x: 1214, w: 92, top: 252 },
      { x: 1312, w: 40, top: 296 },
    ];
    const ribs = Array.from({ length: 8 }, (_, i) => `M${778 + i * 8},${G} L${778 + i * 8},118`);
    const wins = boxes.flatMap((b) => windows(b, G, rnd, 13, 16));
    return { boxes, ribs, wins };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      drawLineArt(el, () => {
        lightWindows(el, 0.55);
        if (scrollStore.reducedMotion) return;
        gsap.to(".la-beacon", { opacity: 0.15, duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.fromTo(".la-crown", { opacity: 0.2 }, { opacity: 0.9, duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.25 });
      });
    },
    { scope: svg },
  );

  // Transamerica: x of its sloped edges at height y
  const ta = (y: number, side: -1 | 1) => 620 + side * (30 - ((G - y) / (G - 70)) * 22);

  return (
    <svg ref={svg} viewBox="0 0 1600 420" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Telegraph Hill + Coit Tower */}
      <g stroke={LINE} strokeOpacity="0.55" strokeWidth="1.4">
        <path className="la-draw" d={`M0,${G} C70,${G - 60} 150,${G - 104} 230,${G - 96} C300,${G - 88} 360,${G - 40} 410,${G}`} />
        <path className="la-draw" d={`M178,${G - 100} L178,200 L202,200 L202,${G - 102}`} />
        <path className="la-draw" d="M174,200 L206,200 L206,190 L174,190 Z" />
        {[184, 190, 196].map((x) => (
          <path key={x} className="la-draw" d={`M${x},296 L${x},206`} strokeOpacity="0.3" strokeWidth="1" />
        ))}
      </g>
      {/* everyday towers */}
      <g stroke={LINE} strokeOpacity="0.5" strokeWidth="1.3">
        {art.boxes.map((b, i) => (
          <path key={i} className="la-draw" d={boxPath(b, G)} />
        ))}
        {/* 555 California: dark ribbed slab */}
        <path className="la-draw" d={`M770,${G} L770,118 L842,118 L842,${G}`} strokeOpacity="0.6" />
        {art.ribs.map((d, i) => (
          <path key={i} className="la-draw" d={d} strokeOpacity="0.18" strokeWidth="1" />
        ))}
        {/* 181 Fremont: slanted crown + bracing */}
        <path className="la-draw" d={`M1062,${G} L1062,128 L1096,98 L1120,128 L1120,${G}`} />
        <path className="la-draw" d={`M1062,300 L1120,220 M1120,300 L1062,220 M1062,220 L1120,140`} strokeOpacity="0.25" strokeWidth="1" />
      </g>
      {/* Transamerica Pyramid */}
      <g stroke="var(--accent)" strokeOpacity="0.85" strokeWidth="1.6">
        <path className="la-draw" d={`M590,${G} L612,70 L620,40 L628,70 L650,${G}`} />
        <path className="la-draw" d={`M${ta(200, -1)},200 L${ta(200, -1) - 9},200 L${ta(150, -1) - 7},150 L${ta(150, -1)},150`} />
        <path className="la-draw" d={`M${ta(200, 1)},200 L${ta(200, 1) + 9},200 L${ta(150, 1) + 7},150 L${ta(150, 1)},150`} />
        <path className="la-draw" d="M620,40 L620,16" strokeWidth="1.2" />
      </g>
      <circle className="la-beacon" cx="620" cy="14" r="2.6" fill="#ff4d3d" />
      {/* Salesforce Tower */}
      <g stroke={LINE} strokeOpacity="0.7" strokeWidth="1.5">
        <path className="la-draw" d={`M932,${G} L942,62 Q980,8 1018,62 L1028,${G}`} />
        <path className="la-draw" d="M942,62 L1018,62" strokeOpacity="0.4" strokeWidth="1" />
      </g>
      <g fill="var(--accent-2)">
        {[0, 1, 2, 3, 4].map((k) => (
          <rect key={k} className="la-crown" x={952 + k * 13} y="40" width="5" height="18" rx="1.5" opacity="0" />
        ))}
      </g>
      {/* Ferry Building */}
      <g stroke={LINE} strokeOpacity="0.6" strokeWidth="1.4">
        <path className="la-draw" d={`M1350,${G} L1350,${G - 40} L1580,${G - 40} L1580,${G}`} />
        <path className="la-draw" d={`M1452,${G - 40} L1452,250 L1482,250 L1482,${G - 40}`} />
        <path className="la-draw" d="M1448,250 L1467,222 L1486,250" />
        <path className="la-draw" d="M1467,222 L1467,206" strokeWidth="1" />
        <circle className="la-draw" cx="1467" cy="276" r="9" strokeOpacity="0.8" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} className="la-draw" d={`M${1362 + i * 24},${G - 28} a6,6 0 0 1 12,0 L${1374 + i * 24},${G - 10} L${1362 + i * 24},${G - 10} Z`} strokeOpacity="0.3" strokeWidth="1" />
        ))}
      </g>
      {/* windows */}
      <g fill="var(--accent)">
        {art.wins.map((w, i) => (
          <rect key={i} className="la-win" x={w.x} y={w.y} width="4.5" height="6.5" opacity="0" />
        ))}
      </g>
      <path className="la-draw" d={`M0,${G} L1600,${G}`} stroke={LINE} strokeOpacity="0.7" strokeWidth="1.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The Bay Bridge at night, with the Bay Lights shimmering on its cables */
/* ------------------------------------------------------------------ */

const D = 290; // deck
const WTR = 336; // water line
const TOP = 112; // tower tops
const TOWERS = [250, 580, 1020, 1350];
const ANCHOR = 800;

type Span = [number, number, number, number, number, number]; // x0,y0,cx,cy,x1,y1
const SPANS: Span[] = [
  [70, D - 4, 190, D - 30, TOWERS[0], TOP],
  [TOWERS[0], TOP, 415, 2 * (D - 14) - TOP, TOWERS[1], TOP],
  [TOWERS[1], TOP, 700, D - 30, ANCHOR, D - 54],
  [ANCHOR, D - 54, 900, D - 30, TOWERS[2], TOP],
  [TOWERS[2], TOP, 1185, 2 * (D - 14) - TOP, TOWERS[3], TOP],
  [TOWERS[3], TOP, 1410, D - 30, 1530, D - 4],
];

function cableY(x: number) {
  for (const [x0, y0, cx, cy, x1, y1] of SPANS) {
    if (x < x0 || x > x1) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 28; k++) {
      const m = (lo + hi) / 2;
      const qx = (1 - m) * (1 - m) * x0 + 2 * (1 - m) * m * cx + m * m * x1;
      if (qx < x) lo = m;
      else hi = m;
    }
    return (1 - lo) * (1 - lo) * y0 + 2 * (1 - lo) * lo * cy + lo * lo * y1;
  }
  return D;
}

export function BayBridge({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const art = useMemo(() => {
    const lights: { x: number; y: number }[] = [];
    for (let x = 84; x <= 1516; x += 13) {
      if (TOWERS.some((t) => Math.abs(x - t) < 22) || Math.abs(x - ANCHOR) < 34) continue;
      const y = cableY(x);
      if (D - y > 8) lights.push({ x, y });
    }
    const cable = SPANS.map(([x0, y0, cx, cy, x1, y1], i) => `${i === 0 ? `M${x0},${y0}` : `M${x0},${y0}`} Q${cx},${cy} ${x1},${y1}`).join(" ");
    const towers = TOWERS.map((x) => {
      const legs = `M${x - 16},${WTR} L${x - 14},${TOP - 8} M${x + 16},${WTR} L${x + 14},${TOP - 8}`;
      const panels = [TOP, TOP + 45, TOP + 90, TOP + 135, D - 8];
      const braces = panels
        .slice(0, -1)
        .map((y, k) => `M${x - 15},${y} L${x + 15},${panels[k + 1]} M${x + 15},${y} L${x - 15},${panels[k + 1]}`)
        .join(" ");
      return { legs, braces, cap: `M${x - 20},${TOP - 8} L${x + 20},${TOP - 8}` };
    });
    const waves = [
      { y: WTR + 14, x0: 30, x1: 720 },
      { y: WTR + 20, x0: 820, x1: 1570 },
      { y: WTR + 40, x0: 140, x1: 1080 },
      { y: WTR + 62, x0: 380, x1: 1460 },
    ].map(({ y, x0, x1 }) => {
      let d = `M${x0},${y}`;
      for (let x = x0; x < x1; x += 24) d += " q6,-3 12,0 t12,0";
      return d;
    });
    return { lights, cable, towers, waves };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      const lines = gsap.utils.toArray<SVGPathElement>(el.querySelectorAll(".la-light"));
      const cars = gsap.utils.toArray<SVGCircleElement>(el.querySelectorAll(".la-car"));
      let tick: (() => void) | null = null;
      let running = false;
      const run = (on: boolean) => {
        if (!tick || on === running) return;
        running = on;
        if (on) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
      };
      // only run the light show while the bridge is on screen
      const vis = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => run(self.isActive) });
      drawLineArt(el, () => {
        if (scrollStore.reducedMotion) {
          gsap.set(lines, { opacity: 0.55 });
          return;
        }
        // the Bay Lights: slow travelling waves of brightness along the cables
        tick = () => {
          const t = gsap.ticker.time;
          for (let i = 0; i < lines.length; i++) {
            const x = art.lights[i].x;
            const a = 0.5 + 0.5 * Math.sin(x * 0.018 - t * 1.4);
            const b = 0.5 + 0.5 * Math.sin(x * 0.007 + t * 0.6);
            lines[i].style.opacity = String(0.12 + 0.88 * Math.pow(a * b, 1.6));
          }
        };
        run(vis.isActive);
        cars.forEach((c, i) => {
          const rtl = i % 2 === 1;
          gsap.fromTo(c, { attr: { cx: rtl ? 1530 : 70 }, opacity: 1 }, { attr: { cx: rtl ? 70 : 1530 }, duration: 10 + i * 2.2, delay: i * 1.5, repeat: -1, ease: "none" });
        });
        gsap.to(".la-reflect", { opacity: 0.1, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.3, from: "random" } });
      });
      return () => {
        run(false);
        vis.kill();
      };
    },
  );

  return (
    <svg ref={svg} viewBox="0 0 1600 420" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <filter id="bb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* moon */}
      <circle className="la-draw" cx="1430" cy="62" r="22" stroke={LINE} strokeOpacity="0.7" strokeWidth="1.4" />
      <circle cx="1430" cy="62" r="40" fill={LINE} fillOpacity="0.04" />
      {/* Yerba Buena Island */}
      <path className="la-draw" d={`M1500,${WTR} C1530,${WTR - 50} 1572,${WTR - 64} 1600,${WTR - 58}`} stroke={LINE} strokeOpacity="0.5" strokeWidth="1.4" />
      {/* towers + anchorage */}
      <g stroke={LINE} strokeOpacity="0.6" strokeWidth="1.5">
        {art.towers.map((t, i) => (
          <g key={i}>
            <path className="la-draw" d={t.legs} />
            <path className="la-draw" d={t.cap} />
            <path className="la-draw" d={t.braces} strokeOpacity="0.3" strokeWidth="1" />
          </g>
        ))}
        <path className="la-draw" d={`M${ANCHOR - 30},${WTR} L${ANCHOR - 26},${D - 58} L${ANCHOR + 26},${D - 58} L${ANCHOR + 30},${WTR}`} />
      </g>
      {/* the Bay Lights: one line per vertical cable */}
      <g stroke="#fff7e6" strokeWidth="1.3" filter="url(#bb-glow)">
        {art.lights.map((l, i) => (
          <path key={i} className="la-light" d={`M${l.x},${l.y.toFixed(1)} L${l.x},${D - 2}`} opacity="0" />
        ))}
      </g>
      {/* main cables */}
      <path className="la-draw" d={art.cable} stroke={LINE} strokeOpacity="0.85" strokeWidth="2" />
      {/* deck */}
      <g stroke={LINE} strokeWidth="1.6">
        <path className="la-draw" d={`M40,${D} L1560,${D}`} strokeOpacity="0.8" />
        <path className="la-draw" d={`M40,${D + 12} L1560,${D + 12}`} strokeOpacity="0.45" strokeWidth="1.2" />
      </g>
      {/* cars */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} className="la-car" cx="70" cy={i % 2 ? D + 6 : D - 4} r="2.6" fill={i % 2 ? "#ff4d3d" : "#fff4d6"} filter="url(#bb-glow)" opacity="0" />
      ))}
      {/* water + reflections */}
      <g stroke={LINE} strokeOpacity="0.32" strokeWidth="1.2">
        {art.waves.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      <g stroke="#fff7e6" strokeWidth="1.2">
        {art.lights
          .filter((_, i) => i % 3 === 0)
          .map((l, i) => (
            <path key={i} className="la-reflect" d={`M${l.x - 4},${WTR + 8 + (i % 4) * 9} L${l.x + 4},${WTR + 8 + (i % 4) * 9}`} opacity="0.4" />
          ))}
      </g>
    </svg>
  );
}
