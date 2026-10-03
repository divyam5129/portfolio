"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useFinePointer } from "@/lib/useIsMobile";

/**
 * §4.4 Custom cursor. Dot + lerped ring; any element with data-cursor="LABEL"
 * expands the ring and shows the label. Fine pointers only.
 */
export default function Cursor() {
  const fine = useFinePointer();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add("has-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let label = "";

    gsap.set([dot.current, ring.current], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const glowX = gsap.quickTo(glow.current, "x", { duration: 0.9, ease: "power3.out" });
    const glowY = gsap.quickTo(glow.current, "y", { duration: 0.9, ease: "power3.out" });

    // 3D tilt + sheen for any [data-tilt] card
    let tiltEl: HTMLElement | null = null;
    const resetTilt = (el: HTMLElement) =>
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "elastic.out(1, 0.6)", overwrite: "auto" });
    const tilt = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
      tiltEl = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const max = Number(el.dataset.tilt) || 8;
      gsap.to(el, { rotateY: (px - 0.5) * max, rotateX: -(py - 0.5) * max, transformPerspective: 900, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    };

    const move = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      gsap.set(dot.current, { x: pos.x, y: pos.y, autoAlpha: 1 });
      gsap.set(ring.current, { autoAlpha: 1 });
      glowX(pos.x);
      glowY(pos.y);
      tilt(e);
    };

    const over = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-cursor], a, button");
      const next = target ? target.dataset.cursor ?? (target.tagName === "A" ? "OPEN" : "") : "";
      if (next === label) return;
      label = next;
      const active = Boolean(target);
      if (text.current) text.current.textContent = label;
      gsap.to(ring.current, {
        width: active ? (label ? 72 : 48) : 36,
        height: active ? (label ? 72 : 48) : 36,
        backgroundColor: label ? "rgba(11,13,14,0.6)" : "rgba(11,13,14,0)",
        borderColor: active
          ? getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff8a5b"
          : "rgba(232,230,223,0.35)",
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(text.current, { autoAlpha: label ? 1 : 0, duration: 0.2 });
      gsap.to(dot.current, { scale: active ? 0 : 1, duration: 0.25 });
    };

    const leave = () => gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.2 });

    const tick = () => {
      const k = 1 - Math.pow(1 - 0.18, gsap.ticker.deltaRatio());
      ringPos.x += (pos.x - ringPos.x) * k;
      ringPos.y += (pos.y - ringPos.y) * k;
      gsap.set(ring.current, { x: ringPos.x, y: ringPos.y });
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerleave", leave);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leave);
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [fine]);

  if (!enabled && !fine) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <div ref={glow} className="cursor-glow" />
      <div ref={dot} className="fixed left-0 top-0 h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
      <div
        ref={ring}
        className="fixed left-0 top-0 grid h-9 w-9 place-items-center rounded-full border border-[rgba(232,230,223,0.35)]"
      >
        <span ref={text} className="mono text-[10px] text-[var(--fg)] opacity-0" />
      </div>
    </div>
  );
}
