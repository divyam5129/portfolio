/**
 * Fixed layer behind the page: a dark gradient tinted by the time of day
 * (the CSS variables SmoothScroll writes), a soft horizon glow, and fine grain.
 * Pure CSS, so it paints with the first byte of HTML.
 */
export default function Backdrop() {
  return (
    <>
      <div
        className="fixed inset-0 z-0"
        aria-hidden
        style={{
          background: [
            "radial-gradient(110% 60% at 50% 105%, color-mix(in oklab, var(--horizon) 26%, transparent), transparent 70%)",
            "radial-gradient(60% 50% at 85% 10%, color-mix(in oklab, var(--accent-2) 10%, transparent), transparent 70%)",
            "linear-gradient(to bottom, color-mix(in oklab, var(--sky-top) 45%, #05070d), color-mix(in oklab, var(--sky-mid) 28%, #05070d) 60%, #05070d)",
          ].join(", "),
        }}
      />
      <div className="grain fixed inset-0 z-0" aria-hidden />
      <div className="vignette" aria-hidden />
    </>
  );
}
