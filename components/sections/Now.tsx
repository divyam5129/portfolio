"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { reveal } from "@/lib/anim";
import { hues, site, type Hue } from "@/data/site";
import { Heading, SectionLabel } from "../ui";

const ICONS: React.ReactNode[] = [
  // book
  <path key="b" d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5v-12ZM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z" />,
  // shield with check
  <path key="s" d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6l-7-3Zm-1.2 12.2-3-3 1.4-1.4 1.6 1.6 4.2-4.2 1.4 1.4-5.6 5.6Z" />,
  // compass
  <path key="c" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.8 5.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1ZM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />,
  // box
  <path key="x" d="m12 3 8 4v10l-8 4-8-4V7l8-4Zm0 2.2L6.5 8 12 10.8 17.5 8 12 5.2ZM6 9.7v6.1l5 2.5v-6.1l-5-2.5Zm12 0-5 2.5v6.1l5-2.5V9.7Z" />,
];

export default function Now() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      reveal(".now-intro", ".now-intro");
      reveal(".now-card", ".now-grid");
    },
    { scope: root },
  );

  const { now } = site;

  return (
    <section id="now" ref={root} aria-labelledby="now-title" className="relative py-[16vh]">
      <div className="wrap">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel id="now" />
            <Heading id="now-title" className="mt-5">{`${now.title}.`}</Heading>
          </div>
          <p className="now-intro legible prose-body md:col-span-5 md:text-right md:justify-self-end">{now.intro}</p>
        </div>

        <ul className="now-grid mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {now.items.map((item, i) => {
            const h = hues[item.hue as Hue];
            return (
              <li
                key={item.title}
                className="now-card glass tint flex min-h-[260px] flex-col rounded-3xl p-6"
                style={{ "--a": h.a, "--b": h.b } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="now-icon grid h-12 w-12 place-items-center rounded-2xl"
                    style={{ background: `linear-gradient(135deg, ${h.a}, ${h.b})`, boxShadow: `0 10px 30px -8px ${h.a}` }}
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#0b0d0e]" aria-hidden>
                      {ICONS[i % ICONS.length]}
                    </svg>
                  </span>
                  <span className="mono dim">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mono mt-8" style={{ color: h.a }}>
                  {`// ${item.kicker}`}
                </p>
                <h3 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em]">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-snug text-[var(--fg)]/75">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
