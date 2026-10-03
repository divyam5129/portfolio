"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, scrollStore } from "@/lib/gsap";
import { reveal } from "@/lib/anim";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { chapters, summit } from "@/data/experience";
import { display, hues, type Hue } from "@/data/site";
import { Heading, SectionLabel } from "../ui";

type Row = {
  id: string;
  title: string;
  org: string;
  period: string;
  hue: Hue;
  summary: string;
  bullets: string[];
  tags: string[];
  next?: boolean;
};

const rows: Row[] = [
  ...chapters.map((c) => ({ id: c.id, title: c.title, org: c.org, period: display(c.period), hue: c.hue, summary: c.summary, bullets: c.bullets, tags: c.tags })),
  { id: "next", title: summit.title, org: "Full-time, new grad", period: "June 2027 →", hue: "trail" as Hue, summary: summit.line, bullets: [], tags: [], next: true },
];
const N = rows.length;

/**
 * Experience as a ledger: one line per role. On desktop the section pins and the
 * focus moves down the ledger with scroll; the row in focus opens to show its detail.
 * On phones / reduced motion every row is open.
 */
export default function Experience() {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [mode, setMode] = useState<"stacked" | "pinned">("stacked");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const decide = () => setMode(window.innerWidth >= 900 && !scrollStore.reducedMotion ? "pinned" : "stacked");
    decide();
    const mq = window.matchMedia("(min-width: 900px)");
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  useGSAP(
    () => {
      const scope = root.current!;
      if (mode === "stacked") {
        scrollStore.experience = 1;
        reveal(".ledger-row", ".ledger");
        return;
      }
      setCurrent(0);
      const trigger = ScrollTrigger.create({
        trigger: scope,
        start: "top top",
        end: `+=${(N - 1) * 70}%`,
        pin: true,
        scrub: 0.4,
        refreshPriority: 3,
        onUpdate: (self) => {
          scrollStore.experience = self.progress;
          if (rail.current) rail.current.style.transform = `scaleY(${self.progress})`;
          setCurrent(Math.min(N - 1, Math.floor(self.progress * (N - 1) + 0.5)));
        },
      });
      st.current = trigger;
      if (rail.current) rail.current.style.transform = "scaleY(0)";
      // this pin appears after first paint; re-sort so later pins account for it
      ScrollTrigger.sort();
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => {
        trigger.kill();
        st.current = null;
      };
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );

  const jump = (i: number) => {
    const s = st.current;
    if (!s) return;
    const y = s.start + (s.end - s.start) * (i / (N - 1)) + 2;
    if (getLenis()) scrollToTarget(y, 1.2);
    else window.scrollTo({ top: y });
  };

  const pinned = mode === "pinned";

  return (
    <section id="experience" ref={root} aria-labelledby="experience-title" data-mode={mode} className="relative">
      {/* soft scrim so copy stays readable over the bright midday scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(6,8,16,0.6), rgba(6,8,16,0.3) 60%, rgba(6,8,16,0.4))" }}
        aria-hidden
      />
      <div className={`wrap relative flex flex-col ${pinned ? "h-[100svh] justify-center pb-16 pt-24" : "py-[14vh]"}`}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel id="experience" />
            <Heading id="experience-title" className="mt-4">
              Experience.
            </Heading>
          </div>
          {pinned && (
            <p className="mono glass rounded-full px-4 py-2 tabular-nums" aria-hidden>
              <span className="accent">{String(current + 1).padStart(2, "0")}</span>
              <span className="dim">{` / ${String(N).padStart(2, "0")}`}</span>
            </p>
          )}
        </header>

        <div className="ledger relative mt-10">
          {/* column heads */}
          <div className="mono dim hidden grid-cols-[56px_1.3fr_1fr_160px] gap-4 border-b border-[var(--line-strong)] pb-3 pl-6 md:grid" aria-hidden>
            <span>No.</span>
            <span>Role</span>
            <span>Organization</span>
            <span className="text-right">Period</span>
          </div>

          <ol className="relative pl-6" aria-label="Experience">
            {/* progress rail */}
            <span className="absolute bottom-0 left-0 top-0 w-px bg-[var(--line)]" aria-hidden />
            {pinned && (
              <span
                ref={rail}
                className="absolute bottom-0 left-0 top-0 w-[2px] origin-top"
                style={{ background: `linear-gradient(180deg, ${rows.map((r) => hues[r.hue].a).join(", ")})` }}
                aria-hidden
              />
            )}
            {rows.map((r, i) => {
              const h = hues[r.hue];
              const open = !pinned || current === i;
              const line = (
                <span className="grid w-full grid-cols-[44px_1fr] items-baseline gap-x-4 gap-y-1 md:grid-cols-[56px_1.3fr_1fr_160px]">
                  <span className="mono tabular-nums transition-colors duration-500" style={{ color: open ? h.a : "var(--fg-dim)" }}>
                    {r.next ? "→" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="legible text-[clamp(1.25rem,2vw,1.75rem)] font-semibold leading-tight tracking-[-0.02em]">{r.title}</span>
                  <span className="mono legible col-start-2 text-[var(--fg)]/75 md:col-start-auto">{r.org}</span>
                  <span className="mono legible dim col-start-2 tabular-nums md:col-start-auto md:text-right">{r.period}</span>
                </span>
              );
              return (
                <li
                  key={r.id}
                  className="ledger-row relative border-b border-[var(--line)] transition-opacity duration-500"
                  style={{ opacity: open ? 1 : 0.45 }}
                  aria-current={pinned && current === i ? "step" : undefined}
                >
                  {/* marker on the rail */}
                  <span
                    className="absolute -left-6 top-[22px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border transition-all duration-500"
                    style={{ borderColor: open ? h.a : "var(--line-strong)", background: open ? h.a : "var(--bg)", boxShadow: open ? `0 0 12px ${h.a}` : "none" }}
                    aria-hidden
                  />
                  {pinned ? (
                    <button type="button" onClick={() => jump(i)} aria-expanded={open} className="block w-full py-4 text-left">
                      {line}
                    </button>
                  ) : (
                    <div className="py-4">{line}</div>
                  )}
                  {/* detail */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
                  >
                    <div className="overflow-hidden">
                      <div className="grid gap-5 pb-6 pl-[60px] md:grid-cols-[56px_1.3fr_1fr_160px] md:gap-x-4 md:pl-0">
                        <div className="md:col-start-2">
                          <p className="text-[clamp(1.05rem,1.4vw,1.25rem)] font-medium leading-snug">{r.summary}</p>
                          {r.next ? (
                            <ul className="mt-4 flex flex-wrap gap-2">
                              {summit.paths.map((p) => (
                                <li key={p.title}>
                                  <span className="tag-c normal-case tracking-normal" style={{ "--a": hues[p.hue].a } as React.CSSProperties}>
                                    {p.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {r.bullets.map((b) => (
                                <li key={b} className="flex gap-3 text-[15px] leading-snug text-[var(--fg)]/80">
                                  <span className="mt-[7px] block h-1 w-1 shrink-0 rounded-full" style={{ background: h.a }} />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {r.tags.length > 0 && (
                          <ul className="flex flex-wrap content-start gap-2 md:col-span-2" aria-label="Skills">
                            {r.tags.map((t) => (
                              <li key={t}>
                                <span className="tag-c" style={{ "--a": h.a } as React.CSSProperties}>
                                  {t}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
