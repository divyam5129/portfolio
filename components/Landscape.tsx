import { biomePalette, type Biome } from "@/data/camping";

function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  let s = h >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function ridge(rnd: () => number, base: number, amp: number, w: number, h: number) {
  const f1 = 1.5 + rnd() * 2;
  const f2 = 4 + rnd() * 5;
  const p1 = rnd() * 6.28;
  const p2 = rnd() * 6.28;
  const pts: string[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = i / steps;
    const y = base - amp * (0.55 * Math.sin(t * f1 * Math.PI + p1) + 0.3 * Math.sin(t * f2 * Math.PI + p2) + 0.15 * (rnd() - 0.5) * 2);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
}

/**
 * Procedural, colourful landscape used wherever a real photo hasn't been added
 * yet (gallery, trip cards, portrait). Deterministic per `seed`.
 */
export default function Landscape({
  seed,
  biome = "forest",
  label,
  night = false,
  className = "",
}: {
  seed: string;
  biome?: Biome;
  label?: string;
  night?: boolean;
  className?: string;
}) {
  const pal = biomePalette[biome];
  const rnd = rng(seed);
  const W = 400;
  const H = 500;
  const id = `ls-${seed.replace(/[^a-z0-9]/gi, "")}`;
  const sunX = 80 + rnd() * 240;
  const sunY = 170 + rnd() * 90;
  const ridges = pal.ridges.map((c, i) => ({ c, d: ridge(rnd, 260 + i * 70, 50 - i * 8, W, H) }));
  const trees =
    biome === "forest" || biome === "alpine" || biome === "lake"
      ? Array.from({ length: 14 }, () => ({ x: rnd() * W, s: 18 + rnd() * 26 }))
      : [];
  const stars = night || biome === "desert" ? Array.from({ length: 40 }, () => ({ x: rnd() * W, y: rnd() * 200, r: 0.4 + rnd() * 1.1 })) : [];
  const skyTop = night ? "#070b22" : pal.sky[0];
  const skyBottom = night ? "#3b2a6e" : pal.sky[1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="0.62" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={pal.sun} stopOpacity="1" />
          <stop offset="0.25" stopColor={pal.sun} stopOpacity="0.55" />
          <stop offset="1" stopColor={pal.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyBottom} stopOpacity="0.9" />
          <stop offset="1" stopColor={skyTop} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={night ? 0.85 : 0.35} />
      ))}
      <circle cx={sunX} cy={sunY} r={120} fill={`url(#${id}-sun)`} />
      <circle cx={sunX} cy={sunY} r={22} fill={pal.sun} />
      {ridges.map((r, i) => (
        <path key={i} d={r.d} fill={r.c} />
      ))}
      {pal.water && (
        <g>
          <rect x="0" y={H * 0.78} width={W} height={H * 0.22} fill={`url(#${id}-water)`} />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={sunX - 40 + i * 3} y={H * 0.8 + i * 9} width={80 - i * 8} height="2" fill={pal.sun} opacity={0.55 - i * 0.06} />
          ))}
        </g>
      )}
      {trees.map((t, i) => (
        <path
          key={i}
          d={`M${t.x},${H * 0.78 - t.s * 2.2} L${t.x - t.s * 0.45},${H * 0.78} L${t.x + t.s * 0.45},${H * 0.78} Z`}
          fill={pal.ridges[pal.ridges.length - 1]}
          opacity={0.95}
        />
      ))}
      {label && (
        <text x="20" y={H - 22} fill="#fff" fillOpacity="0.8" fontFamily="var(--font-jetbrains), monospace" fontSize="13" letterSpacing="1.5">
          {label}
        </text>
      )}
    </svg>
  );
}
