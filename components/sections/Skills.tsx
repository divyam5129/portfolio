"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, scrollStore } from "@/lib/gsap";
import { hairlines } from "@/lib/anim";
import { hues, site } from "@/data/site";
import { SectionLabel } from "../ui";

export default function Skills() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-taglist]").forEach((list) => {
        gsap.from(list.children, {
          autoAlpha: 0,
          y: scrollStore.reducedMotion ? 0 : 18,
          duration: 0.6,
          stagger: 0.05,
          scrollTrigger: { trigger: list, start: "top 85%", once: true },
        });
      });
      hairlines(root.current!);

      // magnetic tags (desktop, fine pointer, max 8px)
      if (scrollStore.reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const tags = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
      const cleanups = tags.map((tag) => {
        const xTo = gsap.quickTo(tag, "x", { duration: 0.5, ease: "power3.out" });
        const yTo = gsap.quickTo(tag, "y", { duration: 0.5, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = tag.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const dist = Math.hypot(dx, dy);
          const reach = 110;
          if (dist > reach) {
            xTo(0);
            yTo(0);
            return;
          }
          const f = (1 - dist / reach) * 8;
          xTo((dx / (dist || 1)) * f);
          yTo((dy / (dist || 1)) * f);
        };
        window.addEventListener("pointermove", move, { passive: true });
        return () => window.removeEventListener("pointermove", move);
      });
      return () => cleanups.forEach((c) => c());
    },
    { scope: root },
  );

  const groups = [
    { label: "Work", items: site.skills.work, colors: [hues.sky.a, hues.dawn.b, hues.trail.a, hues.gold.a, hues.pine.a, hues.dusk.a] },
    { label: "Outdoors", items: site.skills.outdoors, colors: [hues.pine.a, hues.gold.a, hues.dawn.a, hues.dusk.b] },
  ];

  return (
    <section id="skills" ref={root} aria-labelledby="skills-title" className="relative py-[22vh]">
      <div className="wrap">
        <SectionLabel id="skills" />
        <h2 id="skills-title" className="h2 legible mt-4">
          Kit list
        </h2>
        <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-6">
          {groups.map((g, gi) => (
            <div key={g.label}>
              <div className="hairline h-px origin-left" data-hairline="x" />
              <p className="mono legible mt-4">{`${String(gi + 1).padStart(2, "0")} // ${g.label}`}</p>
              <ul data-taglist className="mt-6 flex flex-wrap gap-2.5" aria-label={g.label}>
                {g.items.map((t, ti) => (
                  <li key={t}>
                    <span data-magnetic className="tag-c text-[13px] md:px-4 md:py-2.5" style={{ "--a": g.colors[ti % g.colors.length] } as React.CSSProperties}>
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
