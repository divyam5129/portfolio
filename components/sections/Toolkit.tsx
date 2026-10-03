"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";
import { hues, site, type Hue } from "@/data/site";
import { reveal } from "@/lib/anim";
import { Heading, SectionLabel } from "../ui";

/** Small glyph per ITGC domain. */
function DomainGlyph({ id, color }: { id: string; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className="domain-glyph h-14 w-14" aria-hidden>
      <circle cx="32" cy="32" r="30" fill={color} fillOpacity="0.1" />
      {id === "access" && (
        <g {...common}>
          <rect x="20" y="29" width="24" height="18" rx="3" />
          <path d="M25 29v-6a7 7 0 0 1 14 0v6" />
          <circle cx="32" cy="38" r="2.4" fill={color} />
        </g>
      )}
      {id === "change" && (
        <g {...common}>
          <circle cx="20" cy="20" r="4" />
          <circle cx="44" cy="44" r="4" />
          <circle cx="20" cy="44" r="4" />
          <path d="M20 24v16M24 20h10a10 10 0 0 1 10 10v10" />
        </g>
      )}
      {id === "operations" && (
        <g {...common}>
          <circle cx="32" cy="32" r="13" />
          <path d="M32 14v6M32 44v6M14 32h6M44 32h6M19.3 19.3l4.2 4.2M40.5 40.5l4.2 4.2M19.3 44.7l4.2-4.2M40.5 23.5l4.2-4.2" />
          <circle cx="32" cy="32" r="4" fill={color} />
        </g>
      )}
      {id === "development" && (
        <g {...common}>
          <path d="M24 22 14 32l10 10M40 22l10 10-10 10" />
          <path d="M35 18 29 46" />
        </g>
      )}
    </svg>
  );
}

export default function Toolkit() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { toolkit } = site;

  useGSAP(
    () => {
      const reduced = scrollStore.reducedMotion;
      reveal(".tk-intro", ".tk-intro");
      reveal(".domain", ".domains");

      // process: the line fills and each step lights as you scroll past
      const steps = gsap.utils.toArray<HTMLElement>(".step");
      if (reduced) {
        gsap.set([".process-fill-x", ".process-fill-y"], { scaleX: 1, scaleY: 1 });
        steps.forEach((s) => s.setAttribute("data-on", "true"));
        return;
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".process",
          start: "top 75%",
          end: "bottom 55%",
          scrub: 0.6,
          onUpdate: (self) => {
            steps.forEach((s, i) => s.setAttribute("data-on", String(self.progress >= (i + 0.15) / steps.length)));
          },
        },
      });
      tl.fromTo(".process-fill-x", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0).fromTo(".process-fill-y", { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0);
    },
    { scope: root },
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section id="toolkit" ref={root} aria-labelledby="toolkit-title" className="relative py-[16vh]">
      <div className="wrap">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel id="toolkit" />
            <Heading id="toolkit-title" className="mt-5">{`${toolkit.title}.`}</Heading>
          </div>
          <p className="tk-intro legible prose-body md:col-span-5 md:justify-self-end md:text-right">{toolkit.intro}</p>
        </div>

        <ul className="domains mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {toolkit.domains.map((d) => {
            const h = hues[d.hue as Hue];
            const isOpen = open === d.id;
            return (
              <li key={d.id} className="domain">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : d.id)}
                  aria-expanded={isOpen}
                  aria-controls={`dom-${d.id}`}
                  className="glass tint flex h-full w-full flex-col rounded-3xl p-6 text-left"
                  style={{ "--a": h.a, "--b": h.b } as React.CSSProperties}
                >
                  <span className="flex w-full items-start justify-between">
                    <DomainGlyph id={d.id} color={h.a} />
                    <span className="mono dim">{d.code}</span>
                  </span>
                  <span className="mt-6 block text-[30px] font-semibold leading-none tracking-[-0.03em]">{d.title}</span>
                  <span className="mt-3 block text-[15px] leading-snug text-[var(--fg)]/80">{d.line}</span>
                  <span
                    id={`dom-${d.id}`}
                    className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
                  >
                    <span className="overflow-hidden">
                      <span className="mono mt-5 block" style={{ color: h.a }}>
                        {"// Typical evidence"}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-2">
                        {d.examples.map((ex) => (
                          <span key={ex} className="tag-c normal-case tracking-normal" style={{ "--a": h.a } as React.CSSProperties}>
                            {ex}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                  <span className="mono mt-auto pt-6 text-[10px]" style={{ color: h.a }}>
                    {isOpen ? "[ − ] Less" : "[ + ] What gets checked"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* how a control gets tested */}
        <div className="process mt-20">
          <p className="mono legible flex items-center gap-2.5">
            <span className="dot" aria-hidden />
            {"// How a control gets tested"}
          </p>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-5 md:gap-4">
            {/* track */}
            <span className="absolute left-[11px] top-0 h-full w-px bg-[var(--line)] md:left-0 md:top-[11px] md:h-px md:w-full" aria-hidden />
            <span
              className="process-fill-y absolute left-[11px] top-0 h-full w-[2px] origin-top md:hidden"
              style={{ background: "linear-gradient(180deg, var(--accent), var(--accent-2))", boxShadow: "0 0 14px var(--accent)" }}
              aria-hidden
            />
            <span
              className="process-fill-x absolute left-0 top-[10px] hidden h-[2px] w-full origin-left md:block"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))", boxShadow: "0 0 14px var(--accent)" }}
              aria-hidden
            />
            {toolkit.process.map((p, i) => (
              <li key={p.title} className="step group relative pl-10 md:pl-0 md:pt-10" data-on="false">
                <span
                  className="absolute left-0 top-0 grid h-6 w-6 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--bg)] transition-all duration-500 group-data-[on=true]:scale-110 group-data-[on=true]:border-transparent group-data-[on=true]:bg-[var(--accent)] group-data-[on=true]:shadow-[0_0_18px_var(--accent)]"
                  aria-hidden
                >
                  <span className="mono text-[9px] text-[var(--fg)] group-data-[on=true]:text-[#0b0d0e]">{i + 1}</span>
                </span>
                <h3 className="legible text-[22px] font-semibold tracking-[-0.02em] opacity-50 transition-opacity duration-500 group-data-[on=true]:opacity-100">
                  {p.title}
                </h3>
                <p className="legible mt-2 text-[15px] leading-snug text-[var(--fg)]/70">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
