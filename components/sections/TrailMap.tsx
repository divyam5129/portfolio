"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { geoMercator, geoPath } from "d3-geo";
import { line, curveCatmullRom } from "d3-shape";
import Image from "next/image";
import { gsap, ScrollTrigger, scrollStore } from "@/lib/gsap";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { biomePalette, campingConfig, formatTripDate, shortName, tripsChronological as trips, type Trip } from "@/data/camping";
import { areaLabels, peaks, towns } from "@/data/mapFeatures";
import { PhotoPlaceholder, SectionLabel } from "../ui";

type Line = [number, number][];
type SierraMap = {
  view: [number, number, number, number];
  interval: number;
  /** flat [x, y, dx, dy, …] integers (1e-4°): first point from the view's SW corner, then deltas */
  contours: { elev: number; lines: number[][] }[];
  lakes: { name: string; rings: Line[] }[];
  rivers: { name: string; lines: Line[] }[];
  roads: { ref: string; major: boolean; lines: Line[] }[];
  parks: { name: string; rings: Line[] }[];
  stateLine: Line[];
};

type Pt = { x: number; y: number };
type Geo = {
  w: number;
  h: number;
  plate: { x: number; y: number; w: number; h: number };
  contours: { d: string; color: string; index: boolean }[];
  lakes: string;
  rivers: string;
  roads: { d: string; major: boolean }[];
  roadLabels: (Pt & { ref: string })[];
  parks: string;
  stateLine: string;
  peaks: (Pt & { name: string; ft: number })[];
  towns: (Pt & { name: string; anchor: "start" | "end" })[];
  areas: (Pt & { name: string; kind: string })[];
  route: string;
  pins: (Pt & { frac: number; side: "left" | "right" })[];
  ticksY: { y: number; label: string }[];
  ticksX: { x: number; label: string }[];
  scale: { x: number; y: number; len: number; label: string };
  compact: boolean;
};

/** Contour colour by elevation (m): valley green → granite tan → snow. */
const RAMP: [number, [number, number, number]][] = [
  [400, [94, 140, 110]],
  [1600, [120, 170, 140]],
  [2400, [214, 178, 120]],
  [3300, [236, 226, 210]],
  [4000, [255, 255, 255]],
];
function contourColor(m: number) {
  for (let k = 1; k < RAMP.length; k++) {
    const [e1, c1] = RAMP[k];
    const [e0, c0] = RAMP[k - 1];
    if (m <= e1 || k === RAMP.length - 1) {
      const t = Math.min(1, Math.max(0, (m - e0) / (e1 - e0)));
      return `rgb(${c0.map((c, n) => Math.round(c + (c1[n] - c) * t)).join(",")})`;
    }
  }
  return "#fff";
}

const pinColor = (t: Trip) => biomePalette[t.biome ?? "forest"].accent;
const shortNameOf = (t: Trip) => shortName(t.name).toUpperCase();

const nightsKnown = trips.some((t) => t.nights);

const INTRO = 0.1; // share of the pinned scroll used for the map fade-in
const DRAW = 0.85; // share used for drawing the route

export default function TrailMap() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const mapWrap = useRef<HTMLDivElement>(null);
  const maskPath = useRef<SVGPathElement>(null);
  const routePath = useRef<SVGPathElement>(null);
  const hiker = useRef<SVGGElement>(null);
  const pinEls = useRef<(HTMLDivElement | null)[]>([]);
  const counterTrips = useRef<HTMLSpanElement>(null);
  const counterNights = useRef<HTMLSpanElement>(null);
  const dotEls = useRef<(HTMLButtonElement | null)[]>([]);
  const dropped = useRef<boolean[]>(trips.map(() => false));
  const replay = useRef<gsap.core.Tween | null>(null);
  const st = useRef<ScrollTrigger | null>(null);

  const [map, setMap] = useState<SierraMap | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState<number | null>(null);
  const lastPin = useRef<HTMLElement | null>(null);

  /* ---------- data + size ---------- */
  // The baked Sierra map is ~55 kB gzipped: keep it out of the initial load and fetch it once the browser is idle.
  // (Not on scroll: the pin is built when it arrives, so it must land well before the user gets here.)
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      import("@/data/sierra-map.json").then((m) => {
        if (!cancelled) setMap((m.default ?? m) as unknown as SierraMap);
      });
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(load, { timeout: 2500 })
      : window.setTimeout(load, 1200);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.w - width) > 1 || Math.abs(s.h - height) > 1 ? { w: width, h: height } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- projection ---------- */
  const geo = useMemo<Geo | null>(() => {
    if (!map || size.w < 10 || size.h < 10) return null;
    const { w, h } = size;
    // Wide: a plate between the heading (left) and the trip card (right). Narrow: below the heading.
    const extent: [[number, number], [number, number]] =
      w >= 1200
        ? [[w * 0.31, 72], [w * 0.72, h - 150]]
        : w >= 900
          ? [[w * 0.44, 72], [w - 24, h - 150]]
          : [[16, 236], [w - 16, h - 136]];
    const [W, S, E, N] = map.view;
    const projection = geoMercator().fitExtent(extent, {
      type: "MultiPoint",
      coordinates: [[W, S], [E, S], [E, N], [W, N]],
    });
    const p = (lng: number, lat: number) => projection([lng, lat]) ?? [0, 0];
    const [x0, y0] = p(W, N);
    const [x1, y1] = p(E, S);
    const plate = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    // small plates (phones) keep only the pins and a few road shields
    const compact = plate.w < 460;
    const path = geoPath(projection);
    const lines = (ls: Line[]) => path({ type: "MultiLineString", coordinates: ls }) ?? "";

    const decode = (flat: number[]): Line => {
      const out: Line = [];
      let x = 0;
      let y = 0;
      for (let k = 0; k < flat.length; k += 2) {
        x += flat[k];
        y += flat[k + 1];
        out.push([W + x / 1e4, S + y / 1e4]);
      }
      return out;
    };
    const contours = map.contours.map((c) => ({
      d: lines(c.lines.map(decode)),
      color: contourColor(c.elev),
      index: c.elev % 1000 === 0,
    }));
    const roads = map.roads.map((r) => ({ d: lines(r.lines), major: r.major }));
    const pts = trips.map((t) => p(t.lng, t.lat));
    const route = line<[number, number]>().curve(curveCatmullRom.alpha(0.5))(pts as [number, number][]) ?? "";

    /* ---- label placement: pins first, then everything else only where it fits ---- */
    type Box = [number, number, number, number];
    const placed: Box[] = [];
    const hits = (b: Box) => placed.filter((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]).length;
    const onPlate = (x: number, y: number, pad = 10) => x > x0 + pad && x < x1 - pad && y > y0 + pad && y < y1 - pad;
    const MONO = 8; // px per character of a pin label (10px mono, tracked out)

    const areas = areaLabels
      .filter(() => !compact)
      .map((a) => {
        const [x, y] = p(a.lng, a.lat);
        placed.push([x, y - 10, x + a.name.length * (a.kind === "state" ? 11 : 8), y + 2]);
        return { x, y, name: a.name, kind: a.kind };
      });
    // candidate boxes for peaks/towns, so pins can steer clear of them
    const peakBox = (x: number, y: number, name: string): Box => [x - 5, y - 9, x + 9 + name.length * 5.6, y + 13];
    const townBox = (x: number, y: number, name: string, anchor: "start" | "end"): Box =>
      anchor === "end" ? [x - 9 - name.length * 5.6, y - 6, x + 3, y + 6] : [x - 3, y - 6, x + 9 + name.length * 5.6, y + 6];
    const soft: Box[] = [
      ...peaks.map((k) => peakBox(...(p(k.lng, k.lat) as [number, number]), k.name)),
      ...towns.map((t) => townBox(...(p(t.lng, t.lat) as [number, number]), t.name, t.anchor ?? "start")),
    ];
    const softHits = (b: Box) => soft.filter((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]).length;

    const pins = pts.map(([x, y], i) => {
      const wl = shortNameOf(trips[i]).length * MONO + 8;
      const right: Box = [x - 8, y - 34, x + 12 + wl, y + 4];
      const left: Box = [x - 12 - wl, y - 34, x + 8, y + 4];
      const fitsRight = right[2] < x1 - 4;
      const fitsLeft = left[0] > x0 + 4;
      const side: "left" | "right" = !fitsRight
        ? "left"
        : !fitsLeft
          ? "right"
          : softHits(left) + hits(left) < softHits(right) + hits(right)
            ? "left"
            : "right";
      placed.push(side === "right" ? right : left);
      return { x, y, frac: 0, side };
    });

    const peakLabels: Geo["peaks"] = [];
    for (const k of compact ? [] : peaks) {
      const [x, y] = p(k.lng, k.lat);
      const b = peakBox(x, y, k.name);
      if (!onPlate(x, y) || b[2] > x1 - 4 || hits(b)) continue;
      placed.push(b);
      peakLabels.push({ x, y, name: k.name, ft: k.ft });
    }
    const townLabels: Geo["towns"] = [];
    for (const t of compact ? [] : towns) {
      const [x, y] = p(t.lng, t.lat);
      const anchor = t.anchor ?? "start";
      const b = townBox(x, y, t.name, anchor);
      if (!onPlate(x, y) || b[0] < x0 + 4 || b[2] > x1 - 4 || hits(b)) continue;
      placed.push(b);
      townLabels.push({ x, y, name: t.name, anchor });
    }
    // one shield per road, as close to the middle of its longest on-plate piece as space allows
    const seen = new Set<string>();
    const roadLabels: Geo["roadLabels"] = [];
    const byLength = [...map.roads].sort((a, b) => Math.max(...b.lines.map((l) => l.length)) - Math.max(...a.lines.map((l) => l.length)));
    for (const r of byLength) {
      if (seen.has(r.ref) || (compact && seen.size >= 3)) continue;
      const longest = [...r.lines].sort((a, b) => b.length - a.length)[0];
      const cand = longest.map(([lng, lat]) => p(lng, lat)).filter(([x, y]) => onPlate(x, y, 28));
      const mid = (cand.length - 1) / 2;
      const order = cand.map((_, k) => k).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      const half = r.ref.length * 3.1 + 6;
      for (const k of order) {
        const [x, y] = cand[k];
        const b: Box = [x - half, y - 9, x + half, y + 9];
        if (hits(b)) continue;
        placed.push(b);
        seen.add(r.ref);
        roadLabels.push({ x, y, ref: r.ref });
        break;
      }
    }

    // graticule ticks every 0.5° along the plate's left and bottom edges
    const ticksY: Geo["ticksY"] = [];
    const ticksX: Geo["ticksX"] = [];
    for (let lat = Math.ceil(S * 2) / 2; lat <= N; lat += 0.5) {
      const y = p(W, lat)[1];
      if (y > y0 + 20 && y < y1 - 28) ticksY.push({ y, label: `${lat.toFixed(1)}°N` });
    }
    for (let lng = Math.ceil(W * 2) / 2; lng <= E; lng += 0.5) {
      const x = p(lng, S)[0];
      if (x > x0 + 90 && x < x1 - 30) ticksX.push({ x, label: `${Math.abs(lng).toFixed(1)}°W` });
    }

    // 10-mile scale bar in the bottom-left corner
    const scaleLat = S + (N - S) * 0.04;
    const dLng = 16.0934 / (111.32 * Math.cos((scaleLat * Math.PI) / 180));
    const len = p(W + dLng, scaleLat)[0] - p(W, scaleLat)[0];

    return {
      w,
      h,
      plate,
      contours,
      lakes: map.lakes.map((l) => path({ type: "Polygon", coordinates: l.rings }) ?? "").join(""),
      rivers: lines(map.rivers.flatMap((r) => r.lines)),
      roads,
      roadLabels,
      parks: map.parks.map((pk) => path({ type: "Polygon", coordinates: pk.rings }) ?? "").join(""),
      stateLine: lines(map.stateLine),
      peaks: peakLabels,
      towns: townLabels,
      areas,
      route,
      pins,
      ticksY,
      ticksX,
      scale: { x: x0 + 14, y: y1 - 18, len, label: "10 mi" },
      compact,
    };
  }, [map, size]);

  /* ---------- per-progress render ---------- */
  const fracs = useRef<number[]>([]);
  const routeLen = useRef(0);

  const measureFracs = useCallback(() => {
    const p = routePath.current;
    if (!p || !geo) return;
    const L = p.getTotalLength();
    routeLen.current = L;
    const samples = 600;
    const sampled = Array.from({ length: samples + 1 }, (_, i) => {
      const pt = p.getPointAtLength((i / samples) * L);
      return { l: (i / samples) * L, x: pt.x, y: pt.y };
    });
    let lastIdx = 0;
    fracs.current = geo.pins.map((pin) => {
      let best = lastIdx;
      let bestD = Infinity;
      for (let i = lastIdx; i < sampled.length; i++) {
        const d = (sampled[i].x - pin.x) ** 2 + (sampled[i].y - pin.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      lastIdx = best;
      return L ? sampled[best].l / L : 0;
    });
  }, [geo]);

  const render = useCallback((p: number) => {
    const reduced = scrollStore.reducedMotion;
    if (maskPath.current) gsap.set(maskPath.current, { drawSVG: `0% ${Math.max(0.0001, p * 100)}%` });
    if (hiker.current && routePath.current && routeLen.current) {
      const pt = routePath.current.getPointAtLength(p * routeLen.current);
      hiker.current.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      hiker.current.style.opacity = p > 0.001 && p < 0.999 ? "1" : "0";
    }
    let count = 0;
    let nights = 0;
    fracs.current.forEach((f, i) => {
      const on = p >= f - 0.002;
      if (on) {
        count++;
        nights += trips[i].nights ?? 0;
      }
      if (on !== dropped.current[i]) {
        dropped.current[i] = on;
        const el = pinEls.current[i];
        if (el) {
          gsap.killTweensOf(el);
          if (on) {
            if (reduced) gsap.set(el, { autoAlpha: 1, y: 0 });
            else {
              gsap.fromTo(el, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });
            }
          } else gsap.to(el, { autoAlpha: 0, y: -20, duration: 0.25 });
        }
        dotEls.current[i]?.setAttribute("data-on", String(on));
      }
    });
    if (counterTrips.current) counterTrips.current.textContent = `${String(count).padStart(2, "0")}/${String(trips.length).padStart(2, "0")}`;
    if (counterNights.current) counterNights.current.textContent = nightsKnown ? String(nights) : "—";
  }, []);

  /* ---------- scroll wiring ---------- */
  useGSAP(
    () => {
      if (!geo) return;
      measureFracs();
      dropped.current = trips.map(() => false);
      const reduced = scrollStore.reducedMotion;
      if (reduced) {
        render(1);
        return;
      }
      // scoped selectors can't reach the fixed scene layer; grab it directly
      const sceneRoot = document.getElementById("scene-root");
      gsap.set(pinEls.current, { autoAlpha: 0 });
      render(0);
      const proxy = { p: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=240%",
          pin: true,
          scrub: 0.6,
          refreshPriority: 2,
          onUpdate: () => {
            if (replay.current) {
              replay.current.kill();
              replay.current = null;
            }
          },
        },
      });
      st.current = tl.scrollTrigger ?? null;
      // this pin is created after the atlas loads; re-sort so later pins (gallery) account for it
      ScrollTrigger.sort();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      tl.fromTo(mapWrap.current, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: INTRO }, 0)
        .to(sceneRoot, { opacity: 0, duration: INTRO }, 0)
        .to(
          proxy,
          {
            p: 1,
            duration: DRAW,
            onUpdate: () => {
              if (!replay.current) render(proxy.p);
            },
          },
          INTRO,
        )
        .to(sceneRoot, { opacity: 1, duration: 1 - INTRO - DRAW }, INTRO + DRAW);
      return () => {
        if (sceneRoot) gsap.set(sceneRoot, { opacity: 1 });
        st.current = null;
      };
    },
    { scope: root, dependencies: [geo, measureFracs, render], revertOnUpdate: true },
  );

  /* ---------- interactions ---------- */
  const doReplay = () => {
    replay.current?.kill();
    const obj = { p: 0 };
    replay.current = gsap.to(obj, {
      p: 1,
      duration: scrollStore.reducedMotion ? 0.01 : 6,
      ease: "power1.inOut",
      onUpdate: () => render(obj.p),
      onComplete: () => {
        replay.current = null;
      },
    });
  };

  const jumpTo = (i: number) => {
    const s = st.current;
    if (!s || scrollStore.reducedMotion) {
      setActive(i);
      return;
    }
    const f = fracs.current[i] ?? 0;
    const t = INTRO + f * DRAW + 0.01;
    const y = s.start + (s.end - s.start) * t;
    if (getLenis()) scrollToTarget(y, 1.2);
    else window.scrollTo({ top: y });
  };

  const openTrip = (i: number, from: HTMLElement) => {
    lastPin.current = from;
    setActive(i);
  };

  const closeCard = useCallback(() => {
    setActive(null);
    lastPin.current?.focus();
  }, []);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCard();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeCard]);

  const nightsTotal = trips.reduce((a, t) => a + (t.nights ?? 0), 0);

  return (
    <section id="trail-map" ref={root} aria-labelledby="map-title" className="relative h-[100svh] overflow-hidden">
      <div ref={stage} className="absolute inset-0">
        <div
          ref={mapWrap}
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 70% at 72% 28%, color-mix(in oklab, var(--horizon) 38%, transparent), transparent 70%), radial-gradient(50% 60% at 15% 85%, color-mix(in oklab, var(--accent-2) 22%, transparent), transparent 70%), linear-gradient(160deg, var(--sky-top), color-mix(in oklab, var(--sky-mid) 55%, var(--sky-top)))",
          }}
        >
          {geo && (
            <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} className="absolute inset-0" aria-hidden>
              <defs>
                <clipPath id="plate-clip">
                  <rect x={geo.plate.x} y={geo.plate.y} width={geo.plate.w} height={geo.plate.h} />
                </clipPath>
                <linearGradient id="plate-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0c1424" stopOpacity="0.82" />
                  <stop offset="1" stopColor="#140f22" stopOpacity="0.82" />
                </linearGradient>
                <linearGradient id="route-grad" gradientUnits="userSpaceOnUse" x1="0" y1={geo.plate.y + geo.plate.h} x2="0" y2={geo.plate.y}>
                  <stop offset="0" stopColor="#ffd166" />
                  <stop offset="0.5" stopColor="#ff6a2b" />
                  <stop offset="1" stopColor="#f472b6" />
                </linearGradient>
                <mask id="route-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width={geo.w + 200} height={geo.h + 200}>
                  <path ref={maskPath} d={geo.route} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" />
                </mask>
              </defs>

              {/* the plate */}
              <rect x={geo.plate.x} y={geo.plate.y} width={geo.plate.w} height={geo.plate.h} fill="url(#plate-bg)" />
              <g clipPath="url(#plate-clip)" strokeLinejoin="round" strokeLinecap="round" fill="none">
                {geo.contours.map((c, i) => (
                  <path key={i} d={c.d} stroke={c.color} strokeOpacity={c.index ? 0.8 : 0.42} strokeWidth={c.index ? 1 : 0.55} />
                ))}
                <path d={geo.parks} fill="#86efac" fillOpacity="0.05" stroke="#86efac" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="5 3" />
                <path d={geo.rivers} stroke="#7dd3fc" strokeOpacity="0.6" strokeWidth="0.9" />
                <path d={geo.lakes} fill="#38bdf8" fillOpacity="0.38" stroke="#7dd3fc" strokeOpacity="0.85" strokeWidth="0.8" />
                {geo.roads.map((r, i) => (
                  <path key={i} d={r.d} stroke="#f3f1ea" strokeOpacity={r.major ? 0.7 : 0.45} strokeWidth={r.major ? 1.5 : 1} />
                ))}
                <path d={geo.stateLine} stroke="#f3f1ea" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="1 4" />
              </g>

              {/* labels */}
              <g clipPath="url(#plate-clip)" className="font-mono" letterSpacing="0.08em">
                {geo.areas.map((a) => (
                  <text
                    key={a.name}
                    x={a.x}
                    y={a.y}
                    fontSize={a.kind === "state" ? 11 : 9}
                    fill={a.kind === "lake" ? "#bae6fd" : a.kind === "park" ? "#bbf7d0" : "#f3f1ea"}
                    fillOpacity={a.kind === "state" ? 0.4 : 0.8}
                    letterSpacing={a.kind === "state" ? "0.4em" : "0.12em"}
                  >
                    {a.name.toUpperCase()}
                  </text>
                ))}
                {geo.towns.map((t) => (
                  <g key={t.name} transform={`translate(${t.x} ${t.y})`}>
                    <rect x="-2" y="-2" width="4" height="4" fill="#f3f1ea" fillOpacity="0.8" />
                    <text x={t.anchor === "end" ? -7 : 7} dy="3" textAnchor={t.anchor} fontSize="9" fill="#f3f1ea" fillOpacity="0.75">
                      {t.name}
                    </text>
                  </g>
                ))}
                {geo.peaks.map((k) => (
                  <g key={k.name} transform={`translate(${k.x} ${k.y})`}>
                    <path d="M0 -4.5 L4 2.5 L-4 2.5 Z" fill="#f3f1ea" fillOpacity="0.85" />
                    <text x="7" dy="0" fontSize="9" fill="#f3f1ea" fillOpacity="0.85">
                      {k.name}
                    </text>
                    <text x="7" dy="10" fontSize="8" fill="#f3f1ea" fillOpacity="0.5">
                      {`${k.ft.toLocaleString("en-US")} ft`}
                    </text>
                  </g>
                ))}
                {geo.roadLabels.map((r) => (
                  <g key={r.ref} transform={`translate(${r.x} ${r.y})`}>
                    <rect x={-r.ref.length * 3.1 - 4} y="-7" width={r.ref.length * 6.2 + 8} height="13" rx="2" fill="#0b0d0e" fillOpacity="0.85" stroke="#f3f1ea" strokeOpacity="0.5" strokeWidth="0.6" />
                    <text dy="3" textAnchor="middle" fontSize="8" fill="#f3f1ea" fillOpacity="0.9" letterSpacing="0.04em">
                      {r.ref}
                    </text>
                  </g>
                ))}
              </g>

              {/* frame, ticks, scale, north */}
              <g className="font-mono" fontSize="8" fill="var(--fg-dim)" letterSpacing="0.08em">
                <rect x={geo.plate.x} y={geo.plate.y} width={geo.plate.w} height={geo.plate.h} fill="none" stroke="var(--line-strong)" />
                {geo.ticksY.map((t) => (
                  <g key={t.label} transform={`translate(${geo.plate.x} ${t.y})`}>
                    <line x1="0" x2="8" stroke="var(--line-strong)" />
                    <text x="11" dy="3">{t.label}</text>
                  </g>
                ))}
                {geo.ticksX.map((t) => (
                  <g key={t.label} transform={`translate(${t.x} ${geo.plate.y + geo.plate.h})`}>
                    <line y1="0" y2="-8" stroke="var(--line-strong)" />
                    <text y="-11" textAnchor="middle">{t.label}</text>
                  </g>
                ))}
                <g transform={`translate(${geo.scale.x} ${geo.scale.y - 14})`}>
                  <rect width={geo.scale.len / 2} height="3" fill="#f3f1ea" fillOpacity="0.85" />
                  <rect x={geo.scale.len / 2} width={geo.scale.len / 2} height="3" fill="none" stroke="#f3f1ea" strokeOpacity="0.85" strokeWidth="0.6" />
                  <text y="-5">0</text>
                  <text x={geo.scale.len} y="-5" textAnchor="end">{geo.scale.label}</text>
                </g>
                <g transform={`translate(${geo.plate.x + geo.plate.w - 18} ${geo.plate.y + 24})`}>
                  <path d="M0 -12 L4 0 L0 -3 L-4 0 Z" fill="#f3f1ea" fillOpacity="0.85" />
                  <text y="11" textAnchor="middle">N</text>
                </g>
                <text x={geo.plate.x + geo.plate.w} y={geo.plate.y + geo.plate.h + 14} textAnchor="end" fillOpacity="0.8">
                  {geo.compact ? `Contours ${map!.interval} m` : `Contours every ${map!.interval} m · Natural Earth · Terrain Tiles`}
                </text>
              </g>

              {/* guide + drawn route */}
              <path ref={routePath} d={geo.route} stroke="var(--line)" strokeDasharray="2 5" fill="none" />
              <path
                d={geo.route}
                mask="url(#route-mask)"
                stroke="url(#route-grad)"
                strokeWidth="2.4"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,138,61,0.8))" }}
                strokeDasharray="6 5"
                strokeLinecap="round"
                fill="none"
              />
              <g ref={hiker} style={{ opacity: 0 }}>
                <circle r="12" fill="#fff" fillOpacity="0.16" />
                <circle r="4.5" fill="#fff" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />
              </g>
            </svg>
          )}

          {/* pins (HTML, keyboard operable) */}
          {geo &&
            geo.pins.map((p, i) => (
              <div
                key={trips[i].id}
                ref={(el) => {
                  pinEls.current[i] = el;
                }}
                className="absolute"
                style={{ left: p.x, top: p.y }}
              >
                <button
                  type="button"
                  onClick={(e) => openTrip(i, e.currentTarget)}
                  aria-label={trips[i].date ? `${trips[i].name}, ${formatTripDate(trips[i].date)}` : trips[i].name}
                  className="group absolute -translate-x-1/2 -translate-y-full pb-1"
                >
                  <span
                    className="relative block h-3.5 w-3.5 rounded-full border-2 border-white/90 transition-transform group-hover:scale-125"
                    style={{ background: pinColor(trips[i]), boxShadow: `0 0 14px ${pinColor(trips[i])}` }}
                  >
                  </span>
                  <span className="mx-auto block h-2.5 w-px bg-white/70" />
                </button>
                <span
                  className={`mono legible pointer-events-none absolute top-[-26px] whitespace-nowrap text-[10px] text-[var(--fg)] ${p.side === "right" ? "left-3" : "right-3"}`}
                >
                  {shortNameOf(trips[i])}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* header + counters */}
      <div className="wrap pointer-events-none relative z-10 pt-24 md:pt-28">
        <SectionLabel id="trail-map" />
        <h2 id="map-title" className="h2 legible mt-4">
          Trail map
        </h2>
        <p className="mono glass mt-5 inline-flex flex-wrap items-center gap-x-1 rounded-full px-4 py-2 tabular-nums" aria-live="off">
          Trips: <span ref={counterTrips}>{`00/${String(trips.length).padStart(2, "0")}`}</span>
          <span className="dim"> · </span>
          Nights: <span ref={counterNights}>{nightsKnown ? "0" : "—"}</span>
          <span className="dim"> · </span>
          Miles: {campingConfig.miles ?? "—"}
        </p>
        <p className="sr-only">
          {`${trips.length} camping trips in the Sierra Nevada${nightsKnown ? `, ${nightsTotal} nights in total` : ""}: ${trips.map((t) => t.name).join(", ")}. Use the timeline below to open each trip.`}
        </p>
      </div>

      {/* scrubber + replay */}
      <div className="wrap absolute inset-x-0 bottom-20 z-10 md:bottom-24">
        <div className="flex items-center gap-4 md:max-w-[62%]">
          <button type="button" onClick={doReplay} className="mono shrink-0">
            Replay ↺
          </button>
          <ol className="relative flex flex-1 items-center justify-between" aria-label="Trip timeline">
            <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" aria-hidden />
            {trips.map((t, i) => (
              <li key={t.id} className="relative">
                <button
                  type="button"
                  ref={(el) => {
                    dotEls.current[i] = el;
                  }}
                  data-on="false"
                  onClick={(e) => {
                    jumpTo(i);
                    openTrip(i, e.currentTarget);
                  }}
                  aria-label={`Jump to ${t.name}`}
                  className="block h-3 w-3 -m-1 box-content rounded-full p-1 before:block before:h-full before:w-full before:rounded-full before:border before:border-white/40 before:bg-[rgba(9,11,20,0.6)] data-[on=true]:before:border-white data-[on=true]:before:bg-[var(--pin)] data-[on=true]:before:shadow-[0_0_10px_var(--pin)]"
                  style={{ "--pin": pinColor(t) } as React.CSSProperties}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <TripCard trip={active === null ? null : trips[active]} onClose={closeCard} />
    </section>
  );
}

function TripCard({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState<Trip | null>(trip);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const mobile = window.innerWidth < 768;
    if (trip) {
      setShown(trip);
      setPhoto(0);
      gsap.killTweensOf(el);
      gsap.fromTo(
        el,
        mobile ? { yPercent: 100, autoAlpha: 1 } : { xPercent: 110, autoAlpha: 1 },
        { yPercent: 0, xPercent: 0, duration: scrollStore.reducedMotion ? 0.01 : 0.6, ease: "power3.out" },
      );
    } else {
      gsap.to(el, {
        ...(mobile ? { yPercent: 100 } : { xPercent: 110 }),
        duration: scrollStore.reducedMotion ? 0.01 : 0.4,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(el, { autoAlpha: 0 });
          setShown(null);
        },
      });
    }
  }, [trip]);

  // move focus into the card once its content has rendered
  useEffect(() => {
    if (trip && shown === trip) closeBtn.current?.focus();
  }, [trip, shown]);

  const photos = shown?.photos ?? [];
  const slides = photos.length ? photos : [""];

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="trip-title"
      className="glass invisible absolute inset-x-0 bottom-0 z-30 max-h-[78svh] overflow-y-auto rounded-t-3xl md:inset-x-auto md:bottom-24 md:right-6 md:top-24 md:max-h-none md:w-[380px] md:rounded-3xl"
    >
      {shown && (
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="mono dim">{`// Trip ${String(trips.indexOf(shown) + 1).padStart(2, "0")} of ${String(trips.length).padStart(2, "0")}`}</p>
            <button ref={closeBtn} type="button" onClick={onClose} className="mono" aria-label="Close trip card">
              Esc ✕
            </button>
          </div>
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl">
            {slides[photo] ? (
              <Image src={slides[photo]} alt={`${shown.name}, photo ${photo + 1}`} fill sizes="380px" className="object-cover" />
            ) : (
              <PhotoPlaceholder label={shortNameOf(shown)} seed={shown.id} biome={shown.biome} />
            )}
          </div>
          {slides.length > 1 && (
            <div className="mono mt-2 flex items-center justify-between">
              <button type="button" onClick={() => setPhoto((p) => (p - 1 + slides.length) % slides.length)} aria-label="Previous photo">
                ← Prev
              </button>
              <span className="dim tabular-nums">{`${photo + 1} / ${slides.length}`}</span>
              <button type="button" onClick={() => setPhoto((p) => (p + 1) % slides.length)} aria-label="Next photo">
                Next →
              </button>
            </div>
          )}
          <h3 id="trip-title" className="mt-5 text-[24px] font-semibold leading-tight tracking-[-0.02em]">
            {shown.name}
          </h3>
          <p className="mono dim mt-1">{shown.area}</p>
          <p className="mt-3 text-[16px] leading-snug text-[var(--fg)]/80">{shown.blurb}</p>
          <dl className="mono mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4">
            <div>
              <dt className="dim">Elevation</dt>
              <dd className="mt-1 text-[var(--fg)]">{`${shown.elevationFt.toLocaleString("en-US")} ft`}</dd>
            </div>
            <div>
              <dt className="dim">Coordinates</dt>
              <dd className="mt-1 text-[var(--fg)] tabular-nums">{`${shown.lat.toFixed(3)}°N ${Math.abs(shown.lng).toFixed(3)}°W`}</dd>
            </div>
            <div>
              <dt className="dim">When</dt>
              <dd className="mt-1 text-[var(--fg)]">{formatTripDate(shown.date)}</dd>
            </div>
            <div>
              <dt className="dim">Nights</dt>
              <dd className="mt-1 text-[var(--fg)]">{shown.nights ?? "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
