"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, scrollStore } from "@/lib/gsap";
import { reveal } from "@/lib/anim";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { chapters, summit } from "@/data/experience";
import { display, hues } from "@/data/site";
import { Heading, SectionLabel } from "../ui";

const N = chapters.length + 1; // + the summit
/** Marker positions (0–1) along the timeline, evenly spaced. */
const XS = Array.from({ length: N }, (_, i) => 0.04 + (i / (N - 1)) * 0.92);

export default function Experience() {
  const root = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const active = useRef(-1);
  const st = useRef<ScrollTrigger | null>(null);
  const [mode, setMode] = useState<"stacked" | "pinned">("stacked");
  const [current, setCurrent] = useState(0);

  // pinned on desktop with motion; stacked on phones and with reduced motion
  useEffect(() => {
    const decide = () => setMode(window.innerWidth >= 900 && !scrollStore.reducedMotion ? "pinned" : "stacked");
    decide();
    const mq = window.matchMedia("(min-width: 900px)");
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  /** Animate from one chapter to another (direction-aware). */
  const show = useCallback((next: number, dir: 1 | -1) => {
    const scope = root.current;
    if (!scope) return;
    const prev = active.current;
    if (next === prev) return;
    active.current = next;
    setCurrent(next);
    if (readout.current) readout.current.textContent = `${String(next + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
    const els = gsap.utils.toArray<HTMLElement>(".chapter", scope);
    const out = els[prev];
    const inn = els[next];
    if (out) {
      gsap.killTweensOf(out);
      gsap.to(out, { autoAlpha: 0, duration: 0.3, ease: "power1.out" });
    }
    if (!inn) return;
    gsap.killTweensOf(inn);
    gsap.fromTo(inn, { autoAlpha: 0, y: 12 * dir }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.1, ease: "power2.out" });
  }, []);

  useGSAP(
    () => {
      const scope = root.current!;
      const chaptersEls = gsap.utils.toArray<HTMLElement>(".chapter", scope);

      if (mode === "stacked") {
        scrollStore.experience = 1;
        chaptersEls.forEach((el) => reveal(el.querySelectorAll(".ch-num, .ch-title, .ch-meta, .ch-card"), el));
        return;
      }

      // ---- pinned mode ----
      gsap.set(chaptersEls, { autoAlpha: 0 });
      active.current = -1;
      show(0, 1);

      const trigger = ScrollTrigger.create({
        trigger: scope,
        start: "top top",
        end: `+=${(N - 1) * 85}%`,
        pin: true,
        scrub: 0.5,
        refreshPriority: 3,
        onUpdate: (self) => {
          const p = self.progress;
          scrollStore.experience = p;
          if (fill.current) fill.current.style.transform = `scaleX(${p})`;
          const next = Math.round(p * (N - 1));
          if (next !== active.current) show(next, next > active.current ? 1 : -1);
        },
      });
      st.current = trigger;
      if (fill.current) fill.current.style.transform = "scaleX(0)";
      // this pin appears after first paint; re-sort so later pins (map, gallery) account for it
      ScrollTrigger.sort();
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        trigger.kill();
        st.current = null;
        gsap.set(chaptersEls, { clearProps: "all" });
      };
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );

  const jump = (i: number) => {
    const s = st.current;
    if (mode === "pinned" && s) {
      const y = s.start + (s.end - s.start) * (i / (N - 1)) + 2;
      if (getLenis()) scrollToTarget(y, 1.4);
      else window.scrollTo({ top: y });
      return;
    }
    document.getElementById(`chapter-${i}`)?.scrollIntoView({ behavior: scrollStore.reducedMotion ? "auto" : "smooth", block: "center" });
  };

  const pinned = mode === "pinned";
  const waypoints = [...chapters.map((c) => ({ label: c.waypoint, hue: hues[c.hue] })), { label: summit.waypoint, hue: hues.trail }];

  return (
    <section id="experience" ref={root} aria-labelledby="experience-title" data-mode={mode} className="relative">
      {/* soft scrim so copy stays readable over the bright midday scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(6,8,16,0.55), rgba(6,8,16,0.18) 55%, rgba(6,8,16,0.35)), linear-gradient(to top, rgba(6,8,16,0.5), transparent 35%)" }}
        aria-hidden
      />
      <div className={`wrap relative flex flex-col ${pinned ? "h-[100svh] pb-[92px] pt-24 md:pt-28" : "py-[14vh]"}`}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel id="experience" />
            <Heading id="experience-title" className="mt-4">
              Experience.
            </Heading>
          </div>
          {pinned && (
            <p className="mono glass rounded-full px-4 py-2 tabular-nums" aria-hidden>
              Step <span ref={readout} className="accent">{`01 / ${String(N).padStart(2, "0")}`}</span>
            </p>
          )}
        </header>

        {/* chapters */}
        <ol className={pinned ? "relative mt-6 flex-1" : "mt-12 space-y-16"} aria-label="Experience">
          {chapters.map((c, i) => {
            const h = hues[c.hue];
            return (
              <li
                key={c.id}
                id={`chapter-${i}`}
                className={`chapter grid items-center gap-8 md:grid-cols-12 ${pinned ? "absolute inset-0" : ""}`}
                aria-hidden={pinned && current !== i ? true : undefined}
                style={{ "--a": h.a, "--b": h.b } as React.CSSProperties}
              >
                <div className="md:col-span-5">
                  <div className="overflow-hidden">
                    <p
                      className="ch-num select-none text-[clamp(5.5rem,13vw,12rem)] font-semibold leading-[0.85] tracking-[-0.06em] tabular-nums"
                      style={{ background: `linear-gradient(120deg, ${h.a}, ${h.b})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <p className="ch-meta mono legible mt-4" style={{ color: h.a }}>
                    {`// ${c.org}`}
                  </p>
                  <h3 className="ch-title legible mt-2 text-[clamp(2.2rem,4.4vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.035em]">{c.title}</h3>
                  <p className="ch-meta mono legible dim mt-3">{display(c.period)}</p>
                </div>
                <div className="ch-card glass tint rounded-3xl p-6 md:col-span-6 md:col-start-7 md:p-8" style={{ "--a": h.a, "--b": h.b } as React.CSSProperties}>
                  <p className="ch-item text-[clamp(1.15rem,1.6vw,1.45rem)] font-medium leading-snug tracking-[-0.01em]">{c.summary}</p>
                  <ul className="mt-6 space-y-3">
                    {c.bullets.map((b) => (
                      <li key={b} className="ch-item flex gap-3 text-[16px] leading-snug text-[var(--fg)]/85">
                        <span className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: h.a, boxShadow: `0 0 10px ${h.a}` }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-7 flex flex-wrap gap-2" aria-label="Skills">
                    {c.tags.map((t) => (
                      <li key={t} className="ch-item">
                        <span className="tag-c" style={{ "--a": h.a } as React.CSSProperties}>
                          {t}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}

          {/* summit */}
          <li
            id={`chapter-${N - 1}`}
            className={`chapter grid items-center gap-8 md:grid-cols-12 ${pinned ? "absolute inset-0" : ""}`}
            aria-hidden={pinned && current !== N - 1 ? true : undefined}
          >
            <div className="md:col-span-5">
              <div className="overflow-hidden">
                <p
                  className="ch-num select-none text-[clamp(5.5rem,13vw,12rem)] font-semibold leading-[0.85] tracking-[-0.06em]"
                  style={{ background: "linear-gradient(120deg, #ff6a2b, #f472b6, #a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                  aria-hidden
                >
                  →
                </p>
              </div>
              <p className="ch-meta mono legible accent mt-4">{"// Next"}</p>
              <h3 className="ch-title legible mt-2 text-[clamp(2.2rem,4.4vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.035em]">{summit.title}</h3>
              <p className="ch-meta mono legible mt-3">{summit.line}</p>
            </div>
            <div className="ch-card grid gap-3 md:col-span-6 md:col-start-7">
              {summit.paths.map((p, k) => {
                const h = hues[p.hue];
                return (
                  <div
                    key={p.title}
                    className="ch-item glass tint flex items-center justify-between rounded-3xl p-6 md:p-7"
                    style={{ "--a": h.a, "--b": h.b } as React.CSSProperties}
                  >
                    <div>
                      <p className="mono" style={{ color: h.a }}>{`// Path ${String.fromCharCode(65 + k)}`}</p>
                      <p className="mt-2 text-[clamp(1.4rem,2.2vw,2rem)] font-semibold leading-tight tracking-[-0.02em]">{p.title}</p>
                    </div>
                    <span className="text-[28px]" style={{ color: h.a }} aria-hidden>
                      ↗
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        </ol>

        {/* timeline */}
        {pinned && (
          <div className="relative mt-4 h-[clamp(72px,10vh,96px)] shrink-0">
            <span className="absolute top-1/2 h-px bg-white/25" style={{ left: `${XS[0] * 100}%`, right: `${(1 - XS[N - 1]) * 100}%` }} aria-hidden />
            <span
              ref={fill}
              className="absolute top-1/2 h-[2px] -translate-y-[0.5px] origin-left"
              style={{
                left: `${XS[0] * 100}%`,
                right: `${(1 - XS[N - 1]) * 100}%`,
                transform: "scaleX(0)",
                background: `linear-gradient(90deg, ${waypoints.map((w) => w.hue.a).join(", ")})`,
              }}
              aria-hidden
            />
            {XS.map((x, i) => {
              const w = waypoints[i];
              const on = current >= i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x * 100}%` }}
                  aria-label={`Go to step ${i + 1}: ${w.label}`}
                  aria-current={current === i ? "step" : undefined}
                >
                  <span
                    className="block h-3.5 w-3.5 rounded-full border-2 transition-all duration-500"
                    style={{
                      borderColor: on ? "#fff" : "rgba(255,255,255,0.45)",
                      background: on ? w.hue.a : "rgba(9,11,20,0.7)",
                      transform: current === i ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                  <span
                    className="mono legible absolute left-1/2 top-[-28px] -translate-x-1/2 whitespace-nowrap text-[10px] transition-opacity duration-500"
                    style={{ color: on ? w.hue.a : "var(--fg)", opacity: current === i ? 1 : 0.6 }}
                  >
                    {w.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
