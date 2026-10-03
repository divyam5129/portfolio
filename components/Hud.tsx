"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, scrambleText, scrollStore } from "@/lib/gsap";
import { SECTION_EVENT } from "./SmoothScroll";
import { site } from "@/data/site";
import { formatClock } from "@/lib/timeOfDay";

const AUDIO_SRC = "/audio/ambient.mp3";

function sectionLabel(i: number) {
  return `////// ${String(i + 1).padStart(2, "0")} ${site.sections[i]?.label ?? ""}`;
}

/** §4.3 HUD: fixed overlay. Pointer events only on the toggles. */
export default function Hud() {
  const label = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const wordmark = useRef<HTMLAnchorElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const clockName = useRef<HTMLSpanElement>(null);
  const dial = useRef<HTMLSpanElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // Section label scramble
  useEffect(() => {
    const onSection = (e: Event) => {
      const i = (e as CustomEvent<number>).detail;
      if (label.current) scrambleText(label.current, sectionLabel(i), { duration: 0.4 });
      if (cue.current) gsap.to(cue.current, { autoAlpha: i === 0 ? 1 : 0, duration: 0.4 });
    };
    window.addEventListener(SECTION_EVENT, onSection);
    return () => window.removeEventListener(SECTION_EVENT, onSection);
  }, []);

  // Progress counter + line, read from the store on the gsap ticker (no React state per frame).
  useEffect(() => {
    let last = -1;
    const update = () => {
      const p = Math.round(scrollStore.progress * 100);
      if (p !== last) {
        last = p;
        if (counter.current) counter.current.textContent = String(p).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleY(${scrollStore.progress})`;
      }
      // time-of-day clock
      const pal = scrollStore.palette;
      const time = formatClock(pal.clock);
      if (clock.current && clock.current.textContent !== time) clock.current.textContent = time;
      if (clockName.current && clockName.current.textContent !== pal.name) clockName.current.textContent = pal.name;
      if (dial.current) dial.current.style.transform = `rotate(${(pal.clock / 1440) * 360}deg)`;
      // wordmark fades in as the hero name leaves
      if (wordmark.current) {
        const w = Math.min(1, Math.max(0, (scrollStore.progress - sectionStart()) * 40));
        wordmark.current.style.opacity = String(0.25 + w * 0.75);
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  // Only show the sound toggle if the file exists.
  useEffect(() => {
    fetch(AUDIO_SRC, { method: "HEAD" })
      .then((r) => setHasAudio(r.ok && (r.headers.get("content-type") ?? "").includes("audio")))
      .catch(() => setHasAudio(false));
  }, []);

  const toggleSound = () => {
    if (!audio.current) {
      audio.current = new Audio(AUDIO_SRC);
      audio.current.loop = true;
      audio.current.volume = 0;
    }
    const a = audio.current;
    if (!soundOn) {
      a.play().catch(() => {});
      gsap.to(a, { volume: 0.25, duration: 1.6, ease: "power2.inOut" });
    } else {
      gsap.to(a, { volume: 0, duration: 0.8, ease: "power2.inOut", onComplete: () => a.pause() });
    }
    setSoundOn(!soundOn);
  };

  useEffect(() => () => audio.current?.pause(), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden={false}>
      {/* top-left wordmark */}
      <div className="absolute left-[var(--gutter)] top-4 md:top-6">
        <a
          ref={wordmark}
          href="#hero"
          className="pointer-events-auto block font-semibold tracking-[-0.02em] text-[15px] leading-none md:text-[17px]"
          data-cursor="TOP"
        >
          {site.name.toUpperCase()}
        </a>
        <p className="mono dim mt-1.5">{`// Portfolio © ${site.year}`}</p>
      </div>

      {/* top-right section label */}
      <p className="mono absolute right-[var(--gutter)] top-4 text-right md:top-6" aria-live="polite">
        <span ref={label}>{sectionLabel(0)}</span>
      </p>

      {/* bottom-left time of day */}
      <div className="absolute bottom-11 left-[var(--gutter)] flex items-center gap-2.5 md:bottom-[52px]" aria-hidden>
        <span className="relative block h-5 w-5 rounded-full border border-[var(--line-strong)]">
          <span ref={dial} className="absolute inset-0 block">
            <span className="absolute left-1/2 top-[2px] block h-[7px] w-[2px] -translate-x-1/2 rounded bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
          </span>
        </span>
        <p className="mono tabular-nums">
          <span ref={clock}>06:12</span> <span className="dim">·</span> <span ref={clockName} className="accent">Dawn</span>
        </p>
      </div>

      {/* bottom-left sound */}
      {hasAudio && (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className="mono pointer-events-auto absolute bottom-4 left-[var(--gutter)] md:bottom-6"
          data-cursor={soundOn ? "MUTE" : "PLAY"}
        >
          Sound: <span className={soundOn ? "accent" : "dim"}>{soundOn ? "On" : "Off"}</span>
        </button>
      )}

      {/* bottom-center scroll cue (hero only) */}
      <div ref={cue} className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
        <span className="mono dim">Scroll ↓</span>
        <span className="relative block h-10 w-px overflow-hidden bg-[var(--line)]">
          <span className="cue-line absolute inset-0 bg-[var(--fg)]" />
        </span>
      </div>

      {/* bottom-right progress */}
      <div className="absolute bottom-4 right-[var(--gutter)] flex items-end gap-3 md:bottom-6">
        <p className="mono tabular-nums" aria-label="Scroll progress">
          <span ref={counter}>000</span>
          <span className="dim"> / 100</span>
        </p>
        <span className="relative block h-16 w-px bg-[var(--line)]">
          <span
            ref={bar}
            className="absolute inset-0 origin-top"
            style={{ transform: "scaleY(0)", background: "linear-gradient(to bottom, var(--accent-2), var(--accent))", boxShadow: "0 0 10px var(--accent)" }}
          />
        </span>
      </div>
    </div>
  );
}

function sectionStart() {
  // the hero occupies roughly the first few percent of the page
  return 0.005;
}
