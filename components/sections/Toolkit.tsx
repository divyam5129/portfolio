"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, scrollStore } from "@/lib/gsap";
import { hues, site, type Hue } from "@/data/site";
import { reveal } from "@/lib/anim";
import { getLenis, scrollToTarget } from "@/lib/lenis";
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

const OK = "#34d399";
const EXC = "#fbbf24";

/** Fades/slides a block in once the walkthrough reaches `at`. */
function Stage({ on, children, className = "" }: { on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`transition-[opacity,transform] duration-500 ease-out ${className}`}
      style={{ opacity: on ? 1 : 0.12, transform: on ? "none" : "translateY(6px)" }}
    >
      {children}
    </div>
  );
}

/** The example workpaper. `step` (0–4) decides how far it has been filled in. */
function Workpaper({ step }: { step: number }) {
  const ex = site.toolkit.example;
  return (
    <div className="glass rounded-3xl p-5 md:p-7" aria-label={`Example workpaper: ${ex.control.title}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-4">
        <p className="mono">
          <span className="dim">Workpaper · </span>
          {`${ex.control.id} ${ex.control.title}`}
        </p>
        <p className="mono dim text-[10px]">{ex.label}</p>
      </div>

      {/* 1 · understand */}
      <Stage on={step >= 0} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:gap-6">
        <p className="text-[15px] leading-snug text-[var(--fg)]/85">{ex.control.text}</p>
        <p className="mono self-start rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[10px]">
          <span className="dim">Risk · </span>
          {ex.control.risk}
        </p>
      </Stage>

      {/* 2 · walk through */}
      <Stage on={step >= 1} className="mt-5">
        <ol className="mono flex flex-wrap items-center gap-x-2 gap-y-2 text-[10px]" aria-label="Walkthrough">
          {ex.walkthrough.map((w, i) => (
            <li key={w} className="flex items-center gap-2">
              <span
                className="rounded-full border px-2.5 py-1 transition-colors duration-500"
                style={{
                  borderColor: step >= 1 ? "color-mix(in oklab, var(--accent) 60%, transparent)" : "var(--line)",
                  transitionDelay: `${step >= 1 ? i * 120 : 0}ms`,
                }}
              >
                {w}
              </span>
              {i < ex.walkthrough.length - 1 && <span className="dim">→</span>}
            </li>
          ))}
        </ol>
      </Stage>

      {/* 3 · sample, 4 · test */}
      <Stage on={step >= 2} className="mt-5">
        <p className="mono dim text-[10px]">{`Sample from ${ex.population}`}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="mono w-full min-w-[520px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="dim border-b border-[var(--line)]">
                <th className="py-2 pr-3 font-normal">#</th>
                <th className="py-2 pr-3 font-normal">User</th>
                <th className="py-2 pr-3 font-normal">Role</th>
                <th className="py-2 pr-3 font-normal">Decision</th>
                {ex.attributes.map((a) => (
                  <th key={a} className="py-2 pr-3 text-center font-normal">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ex.rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--line)] transition-colors duration-500"
                  style={{ background: step >= 3 && r.exception ? "color-mix(in oklab, #fbbf24 10%, transparent)" : undefined }}
                >
                  <td className="dim py-2 pr-3 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2 pr-3">{r.id}</td>
                  <td className="py-2 pr-3 text-[var(--fg)]/80">{r.role}</td>
                  <td className="py-2 pr-3">{r.decision}</td>
                  {ex.attributes.map((a, k) => {
                    const fail = r.exception && k === ex.attributes.length - 1;
                    return (
                      <td key={a} className="py-2 pr-3 text-center">
                        <span
                          className="inline-block transition-[opacity,transform] duration-300"
                          style={{
                            opacity: step >= 3 ? 1 : 0,
                            transform: step >= 3 ? "none" : "scale(0.6)",
                            transitionDelay: `${step >= 3 ? (i * ex.attributes.length + k) * 40 : 0}ms`,
                            color: fail ? EXC : OK,
                          }}
                          aria-label={fail ? "Exception" : "Pass"}
                        >
                          {fail ? "✕" : "✓"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          className="mono mt-2 text-[10px] transition-opacity duration-500"
          style={{ color: EXC, opacity: step >= 3 ? 1 : 0, transitionDelay: step >= 3 ? "700ms" : "0ms" }}
        >
          {`Exception · ${ex.exceptionNote}`}
        </p>
      </Stage>

      {/* 5 · document */}
      <Stage on={step >= 4} className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line)] pt-4">
        <p className="max-w-[46ch] text-[14px] leading-snug">
          <span className="mono dim block text-[10px]">Conclusion</span>
          {ex.conclusion}
        </p>
        <p className="mono text-right text-[10px]">
          <span className="dim">Prepared · </span>
          <span style={{ color: OK }}>✓</span>
          <br />
          <span className="dim">Reviewed · </span>
          <span style={{ color: OK }}>✓</span>
        </p>
      </Stage>
    </div>
  );
}

export default function Toolkit() {
  const root = useRef<HTMLElement>(null);
  const walk = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [step, setStep] = useState(4);
  const { toolkit } = site;
  const S = toolkit.process.length;

  // pinned walkthrough on desktop with motion; otherwise the finished workpaper
  useEffect(() => {
    const decide = () => setPinned(window.innerWidth >= 900 && !scrollStore.reducedMotion);
    decide();
    const mq = window.matchMedia("(min-width: 900px)");
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  useGSAP(
    () => {
      reveal(".tk-intro", ".tk-intro");
      reveal(".domain", ".domains");
      if (!pinned) {
        setStep(S - 1);
        reveal(".walk-col", walk.current!);
        return;
      }
      setStep(0);
      const trigger = ScrollTrigger.create({
        trigger: walk.current,
        start: "top top",
        end: `+=${(S - 1) * 55}%`,
        pin: true,
        scrub: 0.4,
        refreshPriority: 2.5,
        onUpdate: (self) => {
          setStep(Math.min(S - 1, Math.floor(self.progress * (S - 1) + 0.5)));
          if (rail.current) rail.current.style.transform = `scaleY(${self.progress})`;
        },
      });
      st.current = trigger;
      if (rail.current) rail.current.style.transform = "scaleY(0)";
      ScrollTrigger.sort();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => {
        trigger.kill();
        st.current = null;
      };
    },
    { scope: root, dependencies: [pinned], revertOnUpdate: true },
  );

  const jump = (i: number) => {
    const s = st.current;
    if (!s) return;
    const y = s.start + (s.end - s.start) * (i / (S - 1)) + 2;
    if (getLenis()) scrollToTarget(y, 1.2);
    else window.scrollTo({ top: y });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section id="toolkit" ref={root} aria-labelledby="toolkit-title" className="relative pt-[16vh]">
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
      </div>

      {/* how a control gets tested: steps beside a workpaper that fills in */}
      <div ref={walk} className={`wrap grid gap-8 md:grid-cols-12 md:gap-6 ${pinned ? "h-[100svh] content-center" : "py-[14vh]"}`}>
        <div className="walk-col min-w-0 md:col-span-4">
          <p className="mono legible flex items-center gap-2.5">
            <span className="dot" aria-hidden />
            {"// How a control gets tested"}
          </p>
          <ol className="relative mt-8 space-y-1 pl-6">
            <span className="absolute bottom-2 left-0 top-2 w-px bg-[var(--line)]" aria-hidden />
            {pinned && (
              <span
                ref={rail}
                className="absolute bottom-2 left-0 top-2 w-[2px] origin-top"
                style={{ background: "linear-gradient(180deg, var(--accent), var(--accent-2))" }}
                aria-hidden
              />
            )}
            {toolkit.process.map((p, i) => {
              const active = step === i;
              const done = step >= i;
              const body = (
                <>
                  <span className="mono text-[10px]" style={{ color: done ? "var(--accent)" : "var(--fg-dim)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="legible block text-[22px] font-semibold tracking-[-0.02em]">{p.title}</span>
                  <span
                    className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                    style={{ gridTemplateRows: active || !pinned ? "1fr" : "0fr", opacity: active || !pinned ? 1 : 0 }}
                  >
                    <span className="overflow-hidden">
                      <span className="legible block pt-1 text-[15px] leading-snug text-[var(--fg)]/75">{p.body}</span>
                    </span>
                  </span>
                </>
              );
              return (
                <li
                  key={p.title}
                  className="transition-opacity duration-500"
                  style={{ opacity: !pinned || done ? 1 : 0.4 }}
                  aria-current={pinned && active ? "step" : undefined}
                >
                  {pinned ? (
                    <button type="button" onClick={() => jump(i)} className="block w-full py-2 text-left">
                      {body}
                    </button>
                  ) : (
                    <div className="py-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="walk-col min-w-0 md:col-span-8">
          <Workpaper step={step} />
        </div>
      </div>
    </section>
  );
}
