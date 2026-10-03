"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { hairlines, reveal } from "@/lib/anim";
import { hues, site } from "@/data/site";
import { SectionLabel } from "../ui";

export default function Skills() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-taglist]").forEach((list) => reveal(list, list));
      hairlines(root.current!);
    },
    { scope: root },
  );

  const groups = [
    { label: "Work", items: site.skills.work, colors: [hues.sky.a, hues.dawn.b, hues.trail.a, hues.gold.a, hues.pine.a, hues.dusk.a] },
    { label: "Interests", items: site.skills.interests, colors: [hues.pine.a, hues.gold.a, hues.dawn.a, hues.dusk.b] },
  ];

  return (
    <section id="skills" ref={root} aria-labelledby="skills-title" className="relative py-[22vh]">
      <div className="wrap">
        <SectionLabel id="skills" />
        <h2 id="skills-title" className="h2 legible mt-4">
          Skills
        </h2>
        <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-6">
          {groups.map((g, gi) => (
            <div key={g.label}>
              <div className="hairline h-px origin-left" data-hairline="x" />
              <p className="mono legible mt-4">{`${String(gi + 1).padStart(2, "0")} // ${g.label}`}</p>
              <ul data-taglist className="mt-6 flex flex-wrap gap-2.5" aria-label={g.label}>
                {g.items.map((t, ti) => (
                  <li key={t}>
                    <span className="tag-c text-[13px] md:px-4 md:py-2.5" style={{ "--a": g.colors[ti % g.colors.length] } as React.CSSProperties}>
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
