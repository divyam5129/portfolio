"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";
import { drawLineArt, seeded } from "@/lib/anim";
import { LINE, lightWindows } from "./BayArt";

/*
 * More Bay Area scenes in the same hand as BayArt.tsx: a cable car on a hill,
 * the Golden Gate's south tower in the fog, and the Painted Ladies.
 */

const glow = (id: string, sd = 2.4) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={sd} result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/* ------------------------------------------------------------------ */
/* A cable car climbing a San Francisco hill, Alcatraz out in the bay   */
/* ------------------------------------------------------------------ */

const HILL = { x0: 0, y0: 372, x1: 1600, y1: 128 };
const slopeY = (x: number) => HILL.y0 + ((HILL.y1 - HILL.y0) * (x - HILL.x0)) / (HILL.x1 - HILL.x0);
const SLOPE_DEG = (Math.atan2(HILL.y1 - HILL.y0, HILL.x1 - HILL.x0) * 180) / Math.PI;

export function CableCar({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const car = useRef<SVGGElement>(null);
  const art = useMemo(() => {
    const rnd = seeded(41);
    const houses: { d: string; bay: string; cornice: string; wins: { x: number; y: number }[] }[] = [];
    let x = 70;
    while (x < 1540) {
      const w = 92 + Math.round(rnd() * 46);
      const h = 120 + Math.round(rnd() * 70);
      const yl = slopeY(x) - 26;
      const yr = slopeY(x + w) - 26;
      const top = yr - h;
      const d = `M${x},${yl} L${x},${top} L${x + w},${top} L${x + w},${yr}`;
      // a bay window column on the facade
      const bx = x + w * 0.22;
      const bw = w * 0.42;
      const bay = `M${bx},${yr - 16} L${bx + 8},${top + 22} L${bx + bw - 8},${top + 22} L${bx + bw},${yr - 16}`;
      const cornice = `M${x - 4},${top + 8} L${x + w + 4},${top + 8}`;
      const wins: { x: number; y: number }[] = [];
      for (let wy = top + 30; wy < yr - 30; wy += 26) {
        wins.push({ x: bx + 12, y: wy }, { x: bx + bw - 20, y: wy });
        if (rnd() > 0.4) wins.push({ x: x + w - 18, y: wy });
      }
      houses.push({ d, bay, cornice, wins });
      x += w + 6;
    }
    const waves = [
      { y: 74, x0: 30, x1: 560 },
      { y: 90, x0: 90, x1: 700 },
      { y: 106, x0: 20, x1: 460 },
    ].map(({ y, x0, x1 }) => {
      let d = `M${x0},${y}`;
      for (let xx = x0; xx < x1; xx += 24) d += " q6,-3 12,0 t12,0";
      return d;
    });
    return { houses, waves };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      const place = (t: number) => {
        const cx = 120 + t * 1260;
        car.current?.setAttribute("transform", `translate(${cx} ${slopeY(cx) - 6}) rotate(${SLOPE_DEG})`);
      };
      place(0.1);
      drawLineArt(el, () => {
        lightWindows(el, 0.65);
        gsap.to(".la-car-body", { opacity: 1, duration: 0.6 });
        if (scrollStore.reducedMotion) return;
        // up the hill, pause at the top, roll back down
        const p = { t: 0.1 };
        gsap.to(p, { t: 0.92, duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true, repeatDelay: 1.5, onUpdate: () => place(p.t) });
        gsap.to(".la-lighthouse", { opacity: 0.1, duration: 0.25, repeat: -1, repeatDelay: 2.6, yoyo: true });
      });
    },
    { scope: svg },
  );

  return (
    <svg ref={svg} viewBox="0 0 1600 400" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>{glow("cc-glow")}</defs>
      {/* the bay and Alcatraz, top left */}
      <g stroke={LINE} strokeOpacity="0.3" strokeWidth="1.1">
        {art.waves.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      <g stroke={LINE} strokeOpacity="0.55" strokeWidth="1.2">
        <path className="la-draw" d="M200,70 C220,54 262,46 300,50 C320,52 336,60 344,70" />
        <path className="la-draw" d="M248,50 L248,34 L262,34 L262,50" />
        <path className="la-draw" d="M286,50 L286,26 L292,26 L292,50" />
      </g>
      <circle className="la-lighthouse" cx="289" cy="22" r="3" fill="#fff4d6" filter="url(#cc-glow)" />
      {/* rowhouses stepping up the hill */}
      <g stroke={LINE} strokeOpacity="0.5" strokeWidth="1.3">
        {art.houses.map((h, i) => (
          <g key={i}>
            <path className="la-draw" d={h.d} fill="#0a0d1a" fillOpacity="0.85" />
            <path className="la-draw" d={h.bay} strokeOpacity="0.35" strokeWidth="1" />
            <path className="la-draw" d={h.cornice} strokeOpacity="0.4" strokeWidth="1" />
          </g>
        ))}
      </g>
      <g fill="var(--accent)">
        {art.houses.flatMap((h, i) => h.wins.map((w, k) => <rect key={`${i}-${k}`} className="la-win" x={w.x} y={w.y} width="7" height="11" rx="1" opacity="0" />))}
      </g>
      {/* street: sidewalk edge, cable slot, kerb */}
      <g stroke={LINE} strokeWidth="1.4">
        <path className="la-draw" d={`M0,${slopeY(0) - 26} L1600,${slopeY(1600) - 26}`} strokeOpacity="0.35" />
        <path className="la-draw" d={`M0,${slopeY(0)} L1600,${slopeY(1600)}`} strokeOpacity="0.75" />
        <path className="la-draw" d={`M0,${slopeY(0) + 12} L1600,${slopeY(1600) + 12}`} strokeOpacity="0.3" strokeDasharray="10 8" />
      </g>
      {/* the cable car */}
      <g ref={car}>
        <g className="la-car-body" opacity="0">
          <path d="M-70,-4 L-70,-44 Q-70,-56 -54,-58 L54,-58 Q70,-56 70,-44 L70,-4 Z" fill="#0b0e1c" stroke={LINE} strokeOpacity="0.9" strokeWidth="1.4" />
          <path d="M-62,-58 Q0,-70 62,-58" stroke={LINE} strokeOpacity="0.7" strokeWidth="1.2" />
          <path d="M-74,-4 L74,-4" stroke="#ff6a3d" strokeWidth="3" />
          {[-52, -30, -8, 14, 36].map((x) => (
            <rect key={x} x={x} y="-48" width="16" height="16" rx="2" fill="#fff4d6" fillOpacity="0.8" />
          ))}
          <path d="M-62,-22 L62,-22" stroke="#ff6a3d" strokeOpacity="0.8" strokeWidth="1.5" />
          <circle cx="-44" cy="0" r="5" stroke={LINE} strokeOpacity="0.8" strokeWidth="1.2" fill="#0b0e1c" />
          <circle cx="44" cy="0" r="5" stroke={LINE} strokeOpacity="0.8" strokeWidth="1.2" fill="#0b0e1c" />
          <circle cx="70" cy="-30" r="3" fill="#fff4d6" filter="url(#cc-glow)" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The Golden Gate's south tower in the fog                             */
/* ------------------------------------------------------------------ */

export function GoldenGateFog({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const T = 1060; // tower centre
  const TOPY = 44;
  const DECKY = 300;
  const WATERY = 404;
  const art = useMemo(() => {
    const legs = [-1, 1].map((side) => {
      const o = T + side * 46;
      const i = T + side * 20;
      const s1 = T + side * 42;
      const s2 = T + side * 38;
      return `M${o},${WATERY} L${o},250 L${s1},250 L${s1},140 L${s2},140 L${s2},${TOPY} L${i},${TOPY} L${i},${WATERY}`;
    });
    const portals = [TOPY + 22, 112, 196, DECKY + 30].map((y, k) => `M${T - 20},${y} L${T + 20},${y} L${T + 20},${y + (k === 3 ? 22 : 14)} L${T - 20},${y + (k === 3 ? 22 : 14)} Z`);
    // recessed vertical lines on each leg (the art-deco fluting)
    const flutes = [-1, 1].flatMap((side) => [28, 34].map((dx) => `M${T + side * dx},${WATERY - 6} L${T + side * dx},${TOPY + 30}`));
    // main cable from the tower top down to the left, and back up off the right edge
    const cable = `M${T - 30},${TOPY + 4} Q620,${DECKY + 60} 0,${DECKY - 140} M${T + 30},${TOPY + 4} Q1330,${DECKY - 40} 1600,${DECKY - 190}`;
    const sus: string[] = [];
    const leftY = (x: number) => {
      // sample the left cable (quadratic) numerically
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 26; k++) {
        const m = (lo + hi) / 2;
        const qx = (1 - m) * (1 - m) * (T - 30) + 2 * (1 - m) * m * 620 + m * m * 0;
        if (qx > x) lo = m;
        else hi = m;
      }
      return (1 - lo) * (1 - lo) * (TOPY + 4) + 2 * (1 - lo) * lo * (DECKY + 60) + lo * lo * (DECKY - 140);
    };
    for (let x = 30; x < T - 60; x += 22) {
      const y = leftY(x);
      if (DECKY - y > 8) sus.push(`M${x},${y.toFixed(1)} L${x},${DECKY}`);
    }
    const truss: string[] = [];
    for (let x = 0; x < 1600; x += 26) truss.push(`M${x},${DECKY} L${x + 13},${DECKY + 16} L${x + 26},${DECKY}`);
    const waves = [
      { y: WATERY + 12, x0: 40, x1: 900 },
      { y: WATERY + 18, x0: 1000, x1: 1580 },
      { y: WATERY + 36, x0: 200, x1: 1300 },
    ].map(({ y, x0, x1 }) => {
      let d = `M${x0},${y}`;
      for (let x = x0; x < x1; x += 24) d += " q6,-3 12,0 t12,0";
      return d;
    });
    return { legs, portals, flutes, cable, sus, truss, waves };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      drawLineArt(el, () => {
        gsap.to(".la-fog", { opacity: (i) => 0.16 + (i % 3) * 0.06, duration: 2, stagger: 0.2 });
        if (scrollStore.reducedMotion) return;
        // the fog bank pours through the gate, right to left, endlessly
        gsap.utils.toArray<SVGElement>(".la-fog").forEach((f, i) => {
          gsap.fromTo(f, { x: 500 + i * 140 }, { x: -2100, duration: 26 + (i % 4) * 5, ease: "none", repeat: -1, delay: -i * 3.2 });
        });
        gsap.to(".la-beacon", { opacity: 0.1, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.4 });
      });
    },
    { scope: svg },
  );

  return (
    <svg ref={svg} viewBox="0 0 1600 460" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        {glow("gf-glow", 3)}
        <filter id="gf-blur">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      {/* fog behind the bridge */}
      <g filter="url(#gf-blur)" fill="#ffffff">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} className="la-fog" cx={1200 + i * 240} cy={DECKY - 70 + (i % 2) * 40} rx={260 + (i % 3) * 60} ry={48 + (i % 2) * 18} opacity="0" />
        ))}
      </g>
      {/* tower */}
      <g stroke="#ff5a36" strokeWidth="2.6" filter="url(#gf-glow)">
        {art.legs.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
        {art.portals.map((d, i) => (
          <path key={`p${i}`} className="la-draw" d={d} />
        ))}
      </g>
      <g stroke="#ff7a52" strokeOpacity="0.45" strokeWidth="1">
        {art.flutes.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      {[T - 32, T + 32].map((x) => (
        <circle key={x} className="la-beacon" cx={x} cy={TOPY - 6} r="3" fill="#ff3b30" filter="url(#gf-glow)" />
      ))}
      {/* cables, suspenders, deck */}
      <path className="la-draw" d={art.cable} stroke="#ff5a36" strokeWidth="3" filter="url(#gf-glow)" />
      <g stroke="#ff8a66" strokeOpacity="0.65" strokeWidth="1">
        {art.sus.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      <g stroke="#ffd7c2" strokeWidth="2">
        <path className="la-draw" d={`M0,${DECKY} L1600,${DECKY}`} />
        <path className="la-draw" d={`M0,${DECKY + 16} L1600,${DECKY + 16}`} />
      </g>
      <g stroke="#ff7a52" strokeOpacity="0.5" strokeWidth="1">
        {art.truss.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      {/* pier + water */}
      <path className="la-draw" d={`M${T - 64},${WATERY - 10} L${T + 64},${WATERY - 10} L${T + 64},${WATERY + 14} L${T - 64},${WATERY + 14} Z`} stroke="#d9d4cc" strokeOpacity="0.8" strokeWidth="1.5" />
      <g stroke={LINE} strokeOpacity="0.35" strokeWidth="1.2">
        {art.waves.map((d, i) => (
          <path key={i} className="la-draw" d={d} />
        ))}
      </g>
      {/* fog in front, low over the water */}
      <g filter="url(#gf-blur)" fill="#ffffff">
        {[0, 1, 2].map((i) => (
          <ellipse key={i} className="la-fog" cx={1300 + i * 320} cy={WATERY - 30} rx={300} ry={36} opacity="0" />
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The Painted Ladies, with Sutro Tower on the hill behind              */
/* ------------------------------------------------------------------ */

const LADY_COLORS = ["#f9a8d4", "#86efac", "#fde68a", "#c4b5fd", "#7dd3fc", "#fdba74", "#f9a8d4"];

export function PaintedLadies({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const G = 380;
  const art = useMemo(() => {
    const houses = LADY_COLORS.map((color, i) => {
      const w = 150;
      const x = 330 + i * (w + 4);
      const base = G - 40 + i * 6; // the row steps down the hill
      const eave = base - 190;
      const peak = eave - 74;
      const outline = `M${x},${base} L${x},${eave} L${x + w / 2},${peak} L${x + w},${eave} L${x + w},${base}`;
      const gableTrim = `M${x + 16},${eave - 6} L${x + w / 2},${peak + 18} L${x + w - 16},${eave - 6} Z`;
      const attic = `M${x + w / 2 - 12},${eave - 14} L${x + w / 2 - 12},${eave - 40} Q${x + w / 2},${eave - 54} ${x + w / 2 + 12},${eave - 40} L${x + w / 2 + 12},${eave - 14} Z`;
      // a slanted bay window, two storeys
      const bx = x + 18;
      const bay = `M${bx},${base - 30} L${bx},${eave + 20} L${bx + 14},${eave + 12} L${bx + 62},${eave + 12} L${bx + 76},${eave + 20} L${bx + 76},${base - 30}`;
      const storey = `M${x},${(base + eave) / 2 + 6} L${x + w},${(base + eave) / 2 + 6}`;
      const door = `M${x + w - 46},${base} L${x + w - 46},${base - 52} Q${x + w - 32},${base - 66} ${x + w - 18},${base - 52} L${x + w - 18},${base}`;
      const steps = `M${x + w - 52},${base} L${x + w - 52},${base - 6} L${x + w - 12},${base - 6} M${x + w - 56},${base} L${x + w - 8},${base}`;
      const wins = [
        { x: bx + 8, y: eave + 28 },
        { x: bx + 31, y: eave + 28 },
        { x: bx + 54, y: eave + 28 },
        { x: bx + 8, y: (base + eave) / 2 + 22 },
        { x: bx + 31, y: (base + eave) / 2 + 22 },
        { x: bx + 54, y: (base + eave) / 2 + 22 },
        { x: x + w - 42, y: eave + 28 },
        { x: x + w / 2 - 6, y: eave - 34 },
      ];
      return { color, outline, gableTrim, attic, bay, storey, door, steps, wins, lamp: i % 2 === 0 ? { x: x + w + 2, y: base } : null };
    });
    // Sutro Tower: three legs splaying from a hilltop, crossbars at two levels
    const sx = 170;
    const hillTop = 250;
    const sutro = [
      `M${sx - 40},${hillTop} L${sx - 6},60 M${sx},${hillTop + 6} L${sx},52 M${sx + 40},${hillTop} L${sx + 6},60`,
      `M${sx - 48},120 L${sx + 48},120 M${sx - 40},92 L${sx + 40},92`,
      `M${sx - 34},${hillTop - 40} L${sx + 34},${hillTop - 40}`,
      `M${sx - 6},60 L${sx - 6},26 M${sx},52 L${sx},18 M${sx + 6},60 L${sx + 6},26`,
    ];
    return { houses, sutro, sx };
  }, []);

  useGSAP(
    () => {
      const el = svg.current!;
      drawLineArt(el, () => {
        lightWindows(el, 0.75);
        gsap.to(".la-lamp", { opacity: 1, duration: 0.6, stagger: 0.25, delay: 0.4 });
        if (scrollStore.reducedMotion) return;
        gsap.to(".la-beacon", { opacity: 0.1, duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.35 });
        gsap.fromTo(".la-mist", { x: 300 }, { x: -900, duration: 40, ease: "none", repeat: -1 });
      });
    },
    { scope: svg },
  );

  return (
    <svg ref={svg} viewBox="0 0 1600 400" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        {glow("pl-glow", 2.6)}
        <filter id="pl-blur">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      {/* Twin Peaks hill + Sutro Tower */}
      <path className="la-draw" d={`M0,300 C80,262 140,246 ${art.sx},248 C220,250 270,276 340,300`} stroke={LINE} strokeOpacity="0.45" strokeWidth="1.3" />
      <g stroke={LINE} strokeOpacity="0.6" strokeWidth="1.3">
        {art.sutro.map((d, i) => (
          <path key={i} className="la-draw" d={d} strokeOpacity={i === 2 ? 0.35 : 0.6} />
        ))}
      </g>
      {[[art.sx - 6, 24], [art.sx, 16], [art.sx + 6, 24], [art.sx, 90]].map(([x, y], i) => (
        <circle key={i} className="la-beacon" cx={x} cy={y} r="2.6" fill="#ff3b30" filter="url(#pl-glow)" />
      ))}
      {/* a drift of mist behind the row */}
      <g filter="url(#pl-blur)" fill="#ffffff" opacity="0.12">
        <ellipse className="la-mist" cx="900" cy="150" rx="420" ry="40" />
        <ellipse className="la-mist" cx="1500" cy="190" rx="360" ry="34" />
      </g>
      {/* the houses */}
      {art.houses.map((h, i) => (
        <g key={i} stroke={h.color} strokeWidth="1.4">
          <path className="la-draw" d={h.outline} strokeOpacity="0.75" />
          <path className="la-draw" d={h.gableTrim} strokeOpacity="0.4" strokeWidth="1" />
          <path className="la-draw" d={h.attic} strokeOpacity="0.55" strokeWidth="1" />
          <path className="la-draw" d={h.bay} strokeOpacity="0.6" strokeWidth="1.1" />
          <path className="la-draw" d={h.storey} strokeOpacity="0.3" strokeWidth="1" />
          <path className="la-draw" d={h.door} strokeOpacity="0.55" strokeWidth="1.1" />
          <path className="la-draw" d={h.steps} strokeOpacity="0.4" strokeWidth="1" />
        </g>
      ))}
      <g fill="#fff4d6">
        {art.houses.flatMap((h, i) => h.wins.map((w, k) => <rect key={`${i}-${k}`} className="la-win" x={w.x} y={w.y} width="12" height="18" rx="1.5" opacity="0" />))}
      </g>
      {/* street lamps */}
      {art.houses
        .filter((h) => h.lamp)
        .map((h, i) => (
          <g key={i}>
            <path className="la-draw" d={`M${h.lamp!.x},${h.lamp!.y + 12} L${h.lamp!.x},${h.lamp!.y - 56}`} stroke={LINE} strokeOpacity="0.55" strokeWidth="1.2" />
            <circle className="la-lamp" cx={h.lamp!.x} cy={h.lamp!.y - 60} r="4" fill="#ffd9a0" filter="url(#pl-glow)" opacity="0" />
          </g>
        ))}
      {/* the sloping street */}
      <path className="la-draw" d={`M0,${G - 40} L320,${G - 40} L1500,${G + 2} L1600,${G + 2}`} stroke={LINE} strokeOpacity="0.7" strokeWidth="1.4" />
    </svg>
  );
}
