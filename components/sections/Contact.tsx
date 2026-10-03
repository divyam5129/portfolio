"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { reveal } from "@/lib/anim";
import { scrollToTarget } from "@/lib/lenis";
import { display, isTodo, site } from "@/data/site";
import { Arrow, SectionLabel } from "../ui";
import { BayBridge } from "../BayArt";

const LINK_COLORS = ["#ff8a5b", "#38bdf8", "#a78bfa", "#5eead4"];

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      reveal(headline.current, headline.current!);
      reveal(".contact-link", ".contact-links");
    },
    { scope: root },
  );

  // placeholder address stays out of the UI until it's replaced in data/site.ts
  const emailReady = !isTodo(site.email) && !site.email.endsWith("@example.com");
  const links = [
    {
      label: "Email",
      value: emailReady ? display(site.email) : "—",
      href: emailReady ? `mailto:${site.email}` : undefined,
      external: false,
    },
    { label: "LinkedIn", value: isTodo(site.linkedin) ? "—" : "LinkedIn", href: isTodo(site.linkedin) ? undefined : site.linkedin, external: true },
    { label: "GitHub", value: isTodo(site.github) ? "—" : "GitHub", href: isTodo(site.github) ? undefined : site.github, external: true },
    { label: "Resume", value: "Resume", href: site.resume, external: true },
  ];

  return (
    <section id="contact" ref={root} aria-labelledby="contact-title" className="relative flex min-h-[100svh] flex-col justify-between pt-[18vh]">
      <div className="wrap">
        <SectionLabel id="contact" />
        <h2
          id="contact-title"
          ref={headline}
          className="legible mt-6 text-[clamp(4rem,16vw,15rem)] font-semibold leading-[0.9] tracking-[-0.045em]"
        >
          {site.contact.headline.endsWith(".") ? (
            <>
              {site.contact.headline.slice(0, -1)}
              <span className="accent">.</span>
            </>
          ) : (
            site.contact.headline
          )}
        </h2>
        <p className="legible prose-body mt-8 text-[var(--fg)]/80">{site.contact.intro}</p>

        <ul className="contact-links mt-14 grid gap-3 md:grid-cols-4">
          {links.map((l) => (
            <li
              key={l.label}
              className="contact-link glass tint rounded-2xl"
              style={{ "--a": LINK_COLORS[links.indexOf(l)], "--b": "transparent" } as React.CSSProperties}
            >
              {l.href ? (
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="arrow-link flex w-full items-baseline justify-between px-5 py-6"
                >
                  <span>
                    <span className="mono block" style={{ color: LINK_COLORS[links.indexOf(l)] }}>{`// ${l.label}`}</span>
                    <span className="mt-1 block text-[22px] font-medium tracking-[-0.02em]">{l.value}</span>
                  </span>
                  <Arrow />
                </a>
              ) : (
                <div className="flex items-baseline justify-between px-5 py-6">
                  <span>
                    <span className="mono dim block">{`// ${l.label}`}</span>
                    <span className="dim mt-1 block text-[20px]">—</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <BayBridge className="mt-16 block w-full" />

      <footer className="wrap legible mb-20 mt-6 flex items-center justify-between border-t border-white/15 py-6 md:mb-24">
        <p className="mono dim">{`// © ${site.year} ${site.name}`}</p>
        <button
          type="button"
          className="arrow-link mono"
          onClick={() => {
            scrollToTarget(0, 1.6);
            document.getElementById("hero-title")?.focus({ preventScroll: true });
          }}
        >
          Back to top <Arrow glyph="↑" />
        </button>
      </footer>
    </section>
  );
}
