"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, scrollStore } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/lenis";
import { display, isTodo, site } from "@/data/site";
import { Arrow, SectionLabel } from "../ui";

const LINK_COLORS = ["#ff8a5b", "#38bdf8", "#a78bfa", "#5eead4"];

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const reduced = scrollStore.reducedMotion;
      const split = SplitText.create(headline.current!, { type: "chars", aria: "auto" });
      const lastChar = split.chars[split.chars.length - 1] as HTMLElement | undefined;
      if (lastChar?.textContent === ".") lastChar.style.color = "var(--accent)";
      gsap.from(split.chars, {
        yPercent: reduced ? 0 : 110,
        autoAlpha: reduced ? 0 : 1,
        stagger: 0.03,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: { trigger: headline.current, start: "top 85%", once: true },
      });
      gsap.from(".contact-link", {
        autoAlpha: 0,
        y: reduced ? 0 : 16,
        stagger: 0.07,
        duration: 0.7,
        scrollTrigger: { trigger: ".contact-links", start: "top 90%", once: true },
      });

      // letters react to cursor proximity (offset + weight)
      if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const chars = split.chars as HTMLElement[];
      const movers = chars.map((c) => ({
        el: c,
        y: gsap.quickTo(c, "y", { duration: 0.45, ease: "power3.out" }),
      }));
      const move = (e: PointerEvent) => {
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
        movers.forEach(({ el, y }) => {
          const r = el.getBoundingClientRect();
          const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          const k = Math.max(0, 1 - d / 260);
          y(-k * 22);
          gsap.to(el, { fontWeight: 600 - k * 400, duration: 0.4, overwrite: "auto" });
          if (el !== lastChar) el.style.color = k > 0.35 ? accent : "";
        });
      };
      const leave = () =>
        movers.forEach(({ el, y }) => {
          y(0);
          gsap.to(el, { fontWeight: 600, duration: 0.5 });
          if (el !== lastChar) el.style.color = "";
        });
      const area = root.current!;
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerleave", leave);
      return () => {
        area.removeEventListener("pointermove", move);
        area.removeEventListener("pointerleave", leave);
      };
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
          {site.contact.headline}
        </h2>
        <p className="legible prose-body mt-8 text-[var(--fg)]/80">{site.contact.intro}</p>

        <ul className="contact-links mt-14 grid gap-3 md:grid-cols-4">
          {links.map((l) => (
            <li
              key={l.label}
              className="contact-link glass tint rounded-2xl"
              data-tilt="8"
              style={{ "--a": LINK_COLORS[links.indexOf(l)], "--b": "transparent" } as React.CSSProperties}
            >
              {l.href ? (
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="arrow-link flex w-full items-baseline justify-between px-5 py-6"
                  data-cursor="OPEN"
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

      <footer className="wrap legible mb-20 mt-24 flex items-center justify-between border-t border-white/15 py-6 md:mb-24">
        <p className="mono dim">{`// © ${site.year} ${site.name}`}</p>
        <button
          type="button"
          className="arrow-link mono"
          onClick={() => {
            scrollToTarget(0, 1.6);
            document.getElementById("hero-title")?.focus({ preventScroll: true });
          }}
          data-cursor="TOP"
        >
          Back to top <Arrow glyph="↑" />
        </button>
      </footer>
    </section>
  );
}
