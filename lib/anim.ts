"use client";

import { gsap, ScrollTrigger, SplitText, scrollStore, scrambleText } from "./gsap";

/* ---------- loader handshake ---------- */
let loaderDone = false;
const LOADER_EVENT = "trail:loader-done";

export function markLoaderDone() {
  loaderDone = true;
  window.dispatchEvent(new Event(LOADER_EVENT));
}

export function onLoaderDone(cb: () => void) {
  if (loaderDone) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(LOADER_EVENT, handler, { once: true });
  return () => window.removeEventListener(LOADER_EVENT, handler);
}

/* ---------- §7.2 split reveal ---------- */
export function splitReveal(el: HTMLElement, opts: { type?: "chars" | "words" | "lines"; trigger?: Element } = {}) {
  const type = opts.type ?? "words";
  if (scrollStore.reducedMotion) {
    return gsap.from(el, {
      autoAlpha: 0,
      y: 12,
      duration: 0.6,
      scrollTrigger: { trigger: opts.trigger ?? el, start: "top 85%", once: true },
    });
  }
  const split = SplitText.create(el, { type: `lines,${type}`, mask: "lines", aria: "auto" });
  const targets = type === "chars" ? split.chars : type === "words" ? split.words : split.lines;
  return gsap.from(targets, {
    yPercent: 110,
    stagger: 0.03,
    duration: 1,
    ease: "power4.out",
    scrollTrigger: { trigger: opts.trigger ?? el, start: "top 85%", once: true },
  });
}

/* ---------- §7.1 scramble on enter ---------- */
export function scrambleOnEnter(el: HTMLElement) {
  const text = el.textContent ?? "";
  return ScrollTrigger.create({
    trigger: el,
    start: "top 90%",
    once: true,
    onEnter: () => scrambleText(el, text, { duration: 0.5 }),
  });
}

/* ---------- §7.3 scrub word-by-word ---------- */
export function scrubWords(el: HTMLElement, trigger: Element) {
  if (scrollStore.reducedMotion) return null;
  const split = SplitText.create(el, { type: "words", aria: "auto" });
  return gsap.fromTo(
    split.words,
    { opacity: 0.2 },
    {
      opacity: 1,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger, start: "top 75%", end: "bottom 45%", scrub: true },
    },
  );
}

/* ---------- §7.4 hairline draw ---------- */
export function hairlines(scope: Element) {
  const lines = scope.querySelectorAll<HTMLElement>("[data-hairline]");
  lines.forEach((line) => {
    const axis = line.dataset.hairline === "y" ? "scaleY" : "scaleX";
    gsap.from(line, {
      [axis]: 0,
      duration: 1.1,
      ease: "power2.inOut",
      scrollTrigger: { trigger: line, start: "top 92%", once: true },
    });
  });
}
