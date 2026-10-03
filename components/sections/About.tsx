"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { hairlines, reveal } from "@/lib/anim";
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

  const stats = [
    { value: trips.length, label: "Trips on the map", hue: "trail" as Hue },
    { value: trips.reduce((a, t) => a + (t.nights ?? 0), 0), label: "Nights in a tent", hue: "dusk" as Hue },
    { value: chapters.filter((c) => c.kind === "role").length, label: "Roles so far", hue: "sky" as Hue },
    { value: Number(site.graduation.match(/\d{4}/)?.[0] ?? 0), label: "Class of", hue: "pine" as Hue },
  ];

  useGSAP(
    () => {
      reveal(statement.current, statement.current!);
      reveal(frame.current, frame.current!);
      reveal(".spec-cell", ".spec-table");
      reveal(".stat", ".stats");
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

        <figure className="md:col-span-4 md:col-start-9 md:mt-20">
          <div className="crosshair overflow-hidden rounded-[2px]">
            <Crosshairs />
            <div ref={frame} className="relative aspect-[4/5] overflow-hidden">
              <div className="absolute inset-0">
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
              style={{ "--a": hues[s.hue].a, "--b": hues[s.hue].b } as React.CSSProperties}
            >
              <p className="mono dim">{s.label}</p>
              <p className="mt-3 text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums" style={{ color: hues[s.hue].a }}>
                {s.value || "—"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
