"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";
import { biomePalette, formatTripDate, shortName, tripsChronological, type Biome } from "@/data/camping";
import { reveal } from "@/lib/anim";
import { PhotoPlaceholder, SectionLabel } from "../ui";

type Shot = { src: string; alt: string; caption: string; seed: string; biome?: Biome; label: string };

const shots: Shot[] = tripsChronological.flatMap((t) => {
  const year = t.date.slice(0, 4);
  const caption = `// ${shortName(t.name)}, ${year}`;
  const base = { seed: t.id, biome: t.biome, label: shortName(t.name).toUpperCase() };
  if (!t.photos.length) return [{ ...base, src: "", alt: `${t.name}, ${formatTripDate(t.date)} (photo coming soon)`, caption }];
  return t.photos.map((src, i) => ({ ...base, src, alt: `${t.name}, ${formatTripDate(t.date)}, photo ${i + 1}`, caption }));
});

export default function Gallery() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      reveal("[data-frame]", root.current!, { stagger: 0.04 });
      if (scrollStore.reducedMotion) return;
      // the strip scrolls sideways while the section is pinned
      const distance = () => Math.max(0, track.current!.scrollWidth - window.innerWidth);
      gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          refreshPriority: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: root },
  );

  const open = (i: number, el: HTMLElement) => {
    opener.current = el;
    setLightbox(i);
  };
  const close = useCallback(() => {
    setLightbox(null);
    opener.current?.focus();
  }, []);

  return (
    <section
      id="gallery"
      ref={root}
      aria-labelledby="gallery-title"
      className="relative flex h-[100svh] flex-col justify-center overflow-hidden"
    >
      <div className="wrap absolute inset-x-0 top-0 pt-24 md:pt-28">
        <SectionLabel id="gallery" />
        <h2 id="gallery-title" className="h2 legible mt-4">
          Field notes
        </h2>
      </div>

      <div
        className="mt-24 md:mt-28 [html[data-motion=reduced]_&]:overflow-x-auto [html[data-motion=reduced]_&]:snap-x"
        tabIndex={-1}
      >
        <div ref={track} className="flex w-max items-center gap-6 px-[var(--gutter)] pr-[30vw] md:gap-12 md:pl-[38vw]">
          {shots.map((s, i) => (
            <figure key={`${s.caption}-${i}`} data-frame className={`shrink-0 snap-center ${i % 2 ? "md:mt-24" : ""}`}>
              <button
                type="button"
                onClick={(e) => open(i, e.currentTarget)}
                aria-label={`Open photo: ${s.alt}`}
                className="crosshair relative block rounded-[18px] border-white/15 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
              >
                <span className="ch tl" aria-hidden>+</span>
                <span className="ch br" aria-hidden>+</span>
                <span className="relative block aspect-[4/5] w-[68vw] overflow-hidden rounded-[18px] md:w-[min(28vw,420px)]">
                  <span className="absolute inset-0 block">
                    {s.src ? (
                      <Image src={s.src} alt={s.alt} fill sizes="(max-width: 768px) 70vw, 30vw" className="object-cover" />
                    ) : (
                      <PhotoPlaceholder label={`FIG. ${String(i + 1).padStart(2, "0")}  ${s.label}`} seed={s.seed} biome={s.biome} />
                    )}
                  </span>
                </span>
              </button>
              <figcaption className="mono mt-3 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: biomePalette[s.biome ?? "forest"].accent, boxShadow: `0 0 8px ${biomePalette[s.biome ?? "forest"].accent}` }} />
                <span className="legible text-[var(--fg)]/80">{s.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {lightbox !== null && <Lightbox index={lightbox} onClose={close} onNav={setLightbox} />}
    </section>
  );
}

function Lightbox({ index, onClose, onNav }: { index: number; onClose: () => void; onNav: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const s = shots[index];

  useEffect(() => {
    closeBtn.current?.focus();
    gsap.from(ref.current, { autoAlpha: 0, duration: scrollStore.reducedMotion ? 0.01 : 0.35 });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav((index + 1) % shots.length);
      if (e.key === "ArrowLeft") onNav((index - 1 + shots.length) % shots.length);
      if (e.key === "Tab" && ref.current) {
        // minimal focus trap
        const f = ref.current.querySelectorAll<HTMLElement>("button");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onNav]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={s.alt}
      className="fixed inset-0 z-[80] flex flex-col bg-[rgba(11,13,14,0.94)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="wrap flex items-center justify-between pt-5">
        <p className="mono dim tabular-nums">{`${String(index + 1).padStart(2, "0")} / ${String(shots.length).padStart(2, "0")}`}</p>
        <button ref={closeBtn} type="button" onClick={onClose} className="mono" aria-label="Close photo">
          Esc ✕
        </button>
      </div>
      <div className="wrap relative flex flex-1 items-center justify-center py-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative h-full max-h-[75svh] w-full max-w-[900px]">
          {s.src ? (
            <Image src={s.src} alt={s.alt} fill sizes="90vw" className="object-contain" />
          ) : (
            <div className="relative mx-auto aspect-[4/5] h-full max-w-full">
              <PhotoPlaceholder label={s.label} seed={s.seed} biome={s.biome} />
            </div>
          )}
        </div>
      </div>
      <div className="wrap flex items-center justify-between pb-6">
        <button type="button" className="mono" onClick={() => onNav((index - 1 + shots.length) % shots.length)} aria-label="Previous photo">
          ← Prev
        </button>
        <p className="mono dim">{s.caption}</p>
        <button type="button" className="mono" onClick={() => onNav((index + 1) % shots.length)} aria-label="Next photo">
          Next →
        </button>
      </div>
    </div>
  );
}
