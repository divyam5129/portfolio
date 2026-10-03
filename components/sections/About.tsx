"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";
import { hairlines, scrubWords, splitReveal } from "@/lib/anim";
import { display, hues, site, type Hue } from "@/data/site";
import { chapters } from "@/data/experience";
import { trips } from "@/data/camping";
import Landscape from "../Landscape";
import { Crosshairs, SectionLabel } from "../ui";

/** Split the statement so highlighted phrases can carry their own colour. */
function renderStatement(text: string, highlights: { text: string; hue: Hue }[]) {
  const parts: { t: string; hue?: Hue }[] = [];
  let rest = text;
  while (rest.length) {
    let best: { i: number; h: { text: string; hue: Hue } } | null = null;
    for (const h of highlights) {
      const i = rest.indexOf(h.text);
      if (i >= 0 && (!best || i < best.i)) best = { i, h };
    }
    if (!best) {
      parts.push({ t: rest });
      break;
    }
    if (best.i > 0) parts.push({ t: rest.slice(0, best.i) });
    parts.push({ t: best.h.text, hue: best.h.hue });
    rest = rest.slice(best.i + best.h.text.length);
  }
  return parts.map((p, i) =>
    p.hue ? (
      <span key={i} className="hl" style={{ color: hues[p.hue].a, textShadow: `0 0 30px ${hues[p.hue].a}55` }}>
        {p.t}
      </span>
    ) : (
      <Fragment key={i}>{p.t}</Fragment>
    ),
  );
}

export default function About() {
  const root = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);

  const stats = [
    { value: trips.length, label: "Trips on the map", hue: "trail" as Hue },
    { value: trips.reduce((a, t) => a + (t.nights ?? 0), 0), label: "Nights in a tent", hue: "dusk" as Hue },
    { value: chapters.filter((c) => c.kind === "role").length, label: "Roles so far", hue: "sky" as Hue },
    { value: Number(site.graduation.match(/\d{4}/)?.[0] ?? 0), label: "Class of", hue: "pine" as Hue, year: true },
  ];

  useGSAP(
    () => {
      const reduced = scrollStore.reducedMotion;
      if (reduced) {
        splitReveal(statement.current!);
      } else {
        scrubWords(statement.current!, statement.current!);
        gsap.from(statement.current, { autoAlpha: 0, y: 30, duration: 1, scrollTrigger: { trigger: statement.current, start: "top 90%", once: true } });
      }

      // portrait: clip-path reveal + slow scale-down + gentle float
      gsap.from(frame.current, {
        clipPath: reduced ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
        autoAlpha: reduced ? 0 : 1,
        duration: 1.3,
        ease: "power3.inOut",
        scrollTrigger: { trigger: frame.current, start: "top 85%", once: true },
      });
      if (!reduced) {
        gsap.fromTo(img.current, { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: { trigger: frame.current, start: "top bottom", end: "bottom top", scrub: true } });
      }

      gsap.from(".spec-cell", { autoAlpha: 0, y: 16, stagger: 0.1, duration: 0.8, scrollTrigger: { trigger: ".spec-table", start: "top 88%", once: true } });

      // stats: cards pop in, numbers count up
      gsap.from(".stat", { autoAlpha: 0, y: reduced ? 0 : 40, scale: reduced ? 1 : 0.94, stagger: 0.1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".stats", start: "top 88%", once: true } });
      root.current!.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        if (reduced || !target) return;
        const from = el.dataset.year ? target - 40 : 0;
        const obj = { v: from };
        el.textContent = String(from);
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => (el.textContent = String(Math.round(obj.v))),
        });
      });

      hairlines(root.current!);
    },
    { scope: root },
  );

  const { about } = site;

  return (
    <section id="about" ref={root} aria-labelledby="about-title" className="relative min-h-[100svh] py-[16vh]">
      <div className="wrap grid gap-16 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <SectionLabel id="about" />
          <h2 id="about-title" className="sr-only">
            About
          </h2>
          <p ref={statement} className="legible mt-8 text-[clamp(1.85rem,3.8vw,3.4rem)] font-medium leading-[1.1] tracking-[-0.025em]">
            {renderStatement(about.statement, about.highlights as { text: string; hue: Hue }[])}
          </p>
        </div>

        <figure className="md:col-span-4 md:col-start-9 md:mt-20" data-tilt="6">
          <div className="crosshair overflow-hidden rounded-[2px]">
            <Crosshairs />
            <div ref={frame} className="relative aspect-[4/5] overflow-hidden">
              <div ref={img} className="absolute inset-0">
                {about.portrait ? (
                  <Image src={about.portrait} alt={about.portraitAlt} fill sizes="(max-width: 768px) 90vw, 30vw" className="object-cover" />
                ) : (
                  <>
                    <Landscape seed="portrait-divyam" biome="alpine" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="text-[clamp(4rem,9vw,7rem)] font-semibold tracking-[-0.06em] text-white/90 mix-blend-overlay">DG</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <figcaption className="mono mt-3 flex justify-between">
            <span className="accent">{about.caption}</span>
            <span className="dim">{display(site.location)}</span>
          </figcaption>
        </figure>
      </div>

      <div className="wrap mt-20">
        <div className="hairline h-px w-full origin-left" data-hairline="x" />
        <dl className="spec-table grid gap-6 pt-6 md:grid-cols-3">
          {about.spec.map((row) => (
            <div key={row.label} className="spec-cell">
              <dt className="mono dim">{`// ${row.label}`}</dt>
              <dd className="mono mt-2 text-[var(--fg)]">{display(row.value)}</dd>
            </div>
          ))}
        </dl>

        <ul className="stats mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" aria-label="By the numbers">
          {stats.map((s) => (
            <li
              key={s.label}
              className="stat glass tint rounded-2xl p-5 md:p-6"
              data-tilt="10"
              style={{ "--a": hues[s.hue].a, "--b": hues[s.hue].b } as React.CSSProperties}
            >
              <p className="mono dim">{s.label}</p>
              <p className="mt-3 text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ color: hues[s.hue].a }}>
                <span data-count={s.value} data-year={s.year ? "1" : undefined}>
                  {s.value || "—"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
