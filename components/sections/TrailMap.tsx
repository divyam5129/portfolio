"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { geoAlbers, geoAlbersUsa, geoGraticule, geoPath, type GeoProjection } from "d3-geo";
import { line, curveCatmullRom } from "d3-shape";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Image from "next/image";
import { gsap, ScrollTrigger, scrollStore } from "@/lib/gsap";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { biomePalette, campingConfig, formatTripDate, tripsChronological as trips, type Trip } from "@/data/camping";
import { PhotoPlaceholder, SectionLabel } from "../ui";

type Geo = {
  w: number;
  h: number;
  states: { id: string; d: string; home: boolean }[];
  graticule: string;
  route: string;
  pins: { x: number; y: number; frac: number }[];
  ticksY: { y: number; label: string }[];
  ticksX: { x: number; label: string }[];
};

const pinColor = (t: Trip) => biomePalette[t.biome ?? "forest"].accent;
const shortNameOf = (t: Trip) => t.name.split(":")[0].trim().toUpperCase();

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

  const [topo, setTopo] = useState<Topology | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState<number | null>(null);
  const lastPin = useRef<HTMLElement | null>(null);

  /* ---------- data + size ---------- */
  // The atlas is ~115 kB: keep it out of the initial load and fetch it once the browser is idle.
  // (Not on scroll: the pin is built when it arrives, so it must land well before the user gets here.)
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      import("us-atlas/states-10m.json").then((m) => {
        if (!cancelled) setTopo((m.default ?? m) as unknown as Topology);
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
    if (!topo || size.w < 10 || size.h < 10) return null;
    const { w, h } = size;
    const all = feature(topo, topo.objects.states as GeometryCollection) as unknown as FeatureCollection<Geometry>;
    const home = all.features.find((f) => String(f.id) === "06") as Feature<Geometry> | undefined;
    const pad = Math.min(w, h) * 0.08;
    const wide = w > 900;
    const extent: [[number, number], [number, number]] = [
      [pad, pad + (wide ? 0 : 40)],
      [wide ? w * 0.62 : w - pad, h - pad - 40],
    ];
    let projection: GeoProjection;
    if (campingConfig.region === "ca" && home) {
      projection = geoAlbers().parallels([34, 40.5]).rotate([120, 0]).center([0, 37.5]).fitExtent(extent, home);
    } else {
      projection = geoAlbersUsa().fitExtent(extent, all);
    }
    const path = geoPath(projection);
    const states = all.features.map((f) => ({ id: String(f.id), d: path(f) ?? "", home: String(f.id) === "06" }));
    const graticule = campingConfig.region === "ca" ? path(geoGraticule().step([1, 1])()) ?? "" : "";

    const pts = trips.map((t) => projection([t.lng, t.lat]) ?? [0, 0]);
    const route = line<[number, number]>().curve(curveCatmullRom.alpha(0.5))(pts as [number, number][]) ?? "";

    // ticks along the left and bottom edges (blueprint)
    const ticksY: Geo["ticksY"] = [];
    const ticksX: Geo["ticksX"] = [];
    if (campingConfig.region === "ca" && projection.invert) {
      const edgeLng = projection.invert([pad * 0.5, h / 2])?.[0] ?? -124;
      for (let lat = 32; lat <= 42; lat++) {
        const p = projection([edgeLng, lat]);
        if (p && p[1] > 60 && p[1] < h - 60) ticksY.push({ y: p[1], label: `${lat}°N` });
      }
      const edgeLat = projection.invert([w / 2, h - pad * 0.5])?.[1] ?? 32;
      for (let lng = -125; lng <= -113; lng++) {
        const p = projection([lng, edgeLat]);
        if (p && p[0] > 40 && p[0] < w - 40) ticksX.push({ x: p[0], label: `${Math.abs(lng)}°W` });
      }
    }
    return {
      w,
      h,
      states,
      graticule,
      route,
      pins: pts.map(([x, y]) => ({ x, y, frac: 0 })),
      ticksY,
      ticksX,
    };
  }, [topo, size]);

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
    if (counterNights.current) counterNights.current.textContent = String(nights);
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
          end: "+=400%",
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
                <linearGradient id="ca-fill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffb35c" stopOpacity="0.32" />
                  <stop offset="0.55" stopColor="#f472b6" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#a78bfa" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="route-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={geo.w} y2={geo.h}>
                  <stop offset="0" stopColor="#ffd166" />
                  <stop offset="0.5" stopColor="#ff6a2b" />
                  <stop offset="1" stopColor="#f472b6" />
                </linearGradient>
                <mask id="route-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width={geo.w + 200} height={geo.h + 200}>
                  <path ref={maskPath} d={geo.route} stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" />
                </mask>
              </defs>
              <path d={geo.graticule} stroke="#ffffff" strokeOpacity="0.07" strokeWidth="0.6" fill="none" />
              <g strokeLinejoin="round">
                {geo.states.map((s) => (
                  <path
                    key={s.id}
                    d={s.d}
                    fill={s.home ? "url(#ca-fill)" : "rgba(255,255,255,0.025)"}
                    stroke={s.home ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.16)"}
                    strokeWidth={s.home ? 1.2 : 0.7}
                  />
                ))}
              </g>
              {/* ticks */}
              <g className="font-mono" fontSize="9" fill="var(--fg-dim)" letterSpacing="0.08em">
                {geo.ticksY.map((t) => (
                  <g key={t.label} transform={`translate(0 ${t.y})`}>
                    <line x1="0" x2="10" stroke="var(--line-strong)" />
                    <text x="14" dy="3">{t.label}</text>
                  </g>
                ))}
                {geo.ticksX.map((t) => (
                  <g key={t.label} transform={`translate(${t.x} ${geo.h})`}>
                    <line y1="0" y2="-10" stroke="var(--line-strong)" />
                    <text y="-14" textAnchor="middle">{t.label}</text>
                  </g>
                ))}
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
                  aria-label={`${trips[i].name}, ${formatTripDate(trips[i].date)}`}
                  className="group absolute -translate-x-1/2 -translate-y-full pb-1"
                >
                  <span
                    className="relative block h-3.5 w-3.5 rounded-full border-2 border-white/90 transition-transform group-hover:scale-125"
                    style={{ background: pinColor(trips[i]), boxShadow: `0 0 14px ${pinColor(trips[i])}` }}
                  >
                  </span>
                  <span className="mx-auto block h-2.5 w-px bg-white/70" />
                </button>
                <span className="mono dim pointer-events-none absolute left-3 top-[-22px] whitespace-nowrap text-[10px]">
                  {formatTripDate(trips[i].date)}
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
          Nights: <span ref={counterNights}>0</span>
          <span className="dim"> · </span>
          Miles: {campingConfig.miles ?? "—"}
        </p>
        <p className="sr-only">
          {`${trips.length} camping trips, ${nightsTotal} nights in total. Use the timeline below to open each trip.`}
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
            <p className="mono dim">{`// ${formatTripDate(shown.date)}${shown.nights ? ` · ${shown.nights} night${shown.nights > 1 ? "s" : ""}` : ""}`}</p>
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
          <p className="dim mt-2 text-[16px] leading-snug">{shown.blurb}</p>
          <p className="mono dim mt-4">{`${shown.lat.toFixed(3)}°N  ${Math.abs(shown.lng).toFixed(3)}°W`}</p>
        </div>
      )}
    </div>
  );
}
