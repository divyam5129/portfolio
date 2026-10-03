"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, scrambleText, scrollStore } from "@/lib/gsap";
import { onLoaderDone } from "@/lib/anim";
import { scrollToTarget } from "@/lib/lenis";
import { site } from "@/data/site";
import { Arrow } from "../ui";
import GoldenGate from "../GoldenGate";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const bridge = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = scrollStore.reducedMotion;
      const split = SplitText.create(name.current!, { type: "chars,lines", mask: "lines", charsClass: "hero-char", aria: "auto" });

      const intro = gsap.timeline({ paused: true });
      if (reduced) {
        intro.from([pill.current, kicker.current, name.current, sub.current, links.current], { autoAlpha: 0, duration: 0.6, stagger: 0.08 });
      } else {
        intro
          .from(pill.current, { autoAlpha: 0, y: 16, scale: 0.9, duration: 0.8, ease: "back.out(2)" }, 0)
          .from(kicker.current, { autoAlpha: 0, y: 10, duration: 0.6 }, 0.1)
          .from(split.chars, { yPercent: 115, rotate: 6, stagger: 0.035, duration: 1.15, ease: "power4.out" }, 0.05)
          // a warm flash sweeps across the name as the sun "hits" it
          .fromTo(
            split.chars,
            { color: "#ffd2a8", textShadow: "0 0 28px rgba(255,150,90,0.9)" },
            { color: "#f3f1ea", textShadow: "0 0 0px rgba(255,150,90,0)", stagger: 0.035, duration: 1.2, ease: "power2.out" },
            0.35,
          )
          .add(() => {
            if (sub.current) scrambleText(sub.current, site.tagline, { duration: 0.9 });
          }, 0.4)
          .from(links.current!.children, { autoAlpha: 0, y: 14, stagger: 0.08, duration: 0.7 }, 0.65);
      }
      // the Golden Gate draws itself: water → headlands → towers → deck → cable → suspenders
      const q = (sel: string) => bridge.current!.querySelectorAll(sel);
      const draw = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      if (reduced) {
        gsap.set(q(".gg-fillable"), { attr: { "fill-opacity": 1 } });
        gsap.set(q(".gg-car"), { opacity: 0 });
        draw.from(bridge.current, { autoAlpha: 0, duration: 0.8 });
      } else {
        draw
          .fromTo(q(".gg-sun"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.6, stagger: 0.2 }, 0)
          .fromTo(q(".gg-wave"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 1.2, stagger: 0.08 }, 0)
          .fromTo(q(".gg-land"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.4, stagger: 0.1 }, 0.2)
          .to(q(".gg-fillable"), { attr: { "fill-opacity": 1 }, duration: 1.2, ease: "power1.out" }, 1.2)
          .fromTo(q(".gg-tower"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.1, stagger: 0.04 }, 0.5)
          .fromTo(q(".gg-deck"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.1, stagger: 0.12 }, 1.1)
          .fromTo(q(".gg-truss"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.25, stagger: 0.008 }, 1.3)
          .fromTo(q(".gg-cable"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.6 }, 1.5)
          .fromTo(q(".gg-sus"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.35, stagger: { each: 0.007, from: "center" } }, 2.1)
          .fromTo(q(".gg-bird"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.6, stagger: 0.12 }, 2.4)
          .fromTo(q(".gg-wisp"), { opacity: 0 }, { opacity: 1, duration: 2, stagger: 0.3 }, 2.2)
          .add(() => {
            // ambient life once drawn: fog drifts, gulls bob, cars cross
            gsap.to(q(".gg-wisp"), { x: (i) => (i % 2 ? -60 : 70), duration: 9, yoyo: true, repeat: -1, ease: "sine.inOut" });
            gsap.to(q(".gg-bird"), { y: (i) => -8 - i * 3, x: (i) => 12 + i * 6, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.4 });
            q(".gg-car").forEach((car, i) => {
              const rtl = i === 1;
              gsap.fromTo(
                car,
                { attr: { cx: rtl ? 1510 : 90 }, opacity: 1 },
                { attr: { cx: rtl ? 90 : 1510 }, duration: 9 + i * 2.5, delay: i * 1.7, repeat: -1, ease: "none" },
              );
            });
            gsap.to(q(".gg-towers, .gg-cable"), { opacity: 0.82, duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
          });
      }
      const off = onLoaderDone(() => {
        intro.play();
        draw.play();
      });

      // letters light up under the cursor
      const chars = split.chars as HTMLElement[];
      const enter = (e: Event) => {
        const el = e.currentTarget as HTMLElement;
        gsap.fromTo(
          el,
          { color: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff8a5b" },
          { color: "#f3f1ea", duration: 1.4, ease: "power2.out", overwrite: "auto" },
        );
      };
      chars.forEach((c) => c.addEventListener("pointerenter", enter));

      // As scrolling begins the name scales down toward the HUD wordmark (top-left).
      if (!reduced) {
        gsap.to(name.current, {
          scale: 0.16,
          x: () => -(name.current!.getBoundingClientRect().left - 16),
          y: () => -(name.current!.offsetTop - 18),
          autoAlpha: 0,
          transformOrigin: "left top",
          ease: "power2.in",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom 30%", scrub: true, invalidateOnRefresh: true },
        });
        gsap.to(bridge.current, {
          yPercent: -18,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true },
        });
        gsap.to([sub.current, links.current, pill.current, kicker.current], {
          autoAlpha: 0,
          y: -30,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "40% top", scrub: true },
        });
      }
      return () => {
        off();
        chars.forEach((c) => c.removeEventListener("pointerenter", enter));
      };
    },
    { scope: root },
  );

  return (
    <section id="hero" ref={root} aria-labelledby="hero-title" className="relative flex min-h-[100svh] flex-col justify-end pb-28 md:pb-32">
      <div ref={bridge} className="pointer-events-none absolute inset-x-0 top-[14vh] md:top-[3vh]">
        <GoldenGate className="block aspect-[16/7] w-full" />
      </div>
      <div className="wrap relative">
        <div ref={pill} className="glass mb-7 inline-flex items-center gap-3 rounded-full px-4 py-2">
          <span className="pulse relative block h-2 w-2 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" aria-hidden />
          <span className="mono">{`Open to ${site.availability} roles`}</span>
        </div>
        <p ref={kicker} className="mono legible mb-5 flex items-center gap-2.5">
          <span className="dot" aria-hidden />
          {`// 01 ${site.sections[0].label} · ${site.location}`}
        </p>
        <h1 id="hero-title" ref={name} tabIndex={-1} className="display legible will-change-transform">
          {site.name.toUpperCase()}
        </h1>
        <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
          <p ref={sub} className="mono legible md:col-span-6" aria-label={site.tagline}>
            {site.tagline}
          </p>
          <div ref={links} className="flex gap-3 md:col-span-6 md:justify-end">
            <a
              href="#experience"
              className="arrow-link mono glass rounded-full px-5 py-3"
              data-cursor="VIEW"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget("#experience", 1.8);
              }}
            >
              {site.hero.primaryCta} <Arrow glyph="↓" />
            </a>
            <a
              href={site.resume}
              target="_blank"
              rel="noopener"
              className="arrow-link mono rounded-full px-5 py-3 text-[#0b0d0e]"
              style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
              data-cursor="OPEN"
            >
              {site.hero.secondaryCta} <Arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
