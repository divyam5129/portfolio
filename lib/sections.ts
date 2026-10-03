import { site } from "@/data/site";

/** Progress value (0–1) at the top of each section, refreshed with ScrollTrigger. */
export const sectionStops: number[] = site.sections.map((_, i) => i / (site.sections.length - 1));

export function measureStops() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return;
  site.sections.forEach((s, i) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    // pinned sections are wrapped in a pin-spacer; measure the spacer when present
    const box = (el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el) as HTMLElement;
    const top = box.getBoundingClientRect().top + window.scrollY;
    sectionStops[i] = Math.min(1, Math.max(0, top / max));
  });
}

/**
 * Map global scroll progress (0–1) onto section space.
 * Returns the current section index and 0–1 progress through it.
 */
export function sectionPhase(p: number) {
  const n = sectionStops.length;
  for (let i = n - 1; i >= 0; i--) {
    if (p >= sectionStops[i]) {
      const next = i < n - 1 ? sectionStops[i + 1] : 1;
      const span = Math.max(1e-4, next - sectionStops[i]);
      return { section: i, local: Math.min(1, (p - sectionStops[i]) / span) };
    }
  }
  return { section: 0, local: 0 };
}
