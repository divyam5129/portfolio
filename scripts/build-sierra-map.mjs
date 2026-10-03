// Bakes data/sierra-map.json: the Trail Map's base layer for the Sierra Nevada
// (Lake Tahoe → Yosemite). Run with `npm run build:map`; the output is committed,
// so this only needs re-running to change the area or the layers.
//
// Sources (both public domain / open):
//  - Natural Earth 10m: lakes, rivers, roads, park boundaries
//  - Mapzen/AWS Terrain Tiles (terrarium encoding) for elevation → contour lines
//  - us-atlas (already a dependency) for the CA/NV state line

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { contours } from "d3-contour";
import { mesh } from "topojson-client";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(ROOT, "data/sierra-map.json");
const CACHE = path.join(ROOT, ".cache/map");

/** Area shown on the map (lng/lat). The DEM is fetched a little wider so contour edges fall outside it. */
const VIEW = { w: -120.55, e: -118.85, s: 37.5, n: 39.35 };
const DEM = { w: VIEW.w - 0.15, e: VIEW.e + 0.15, s: VIEW.s - 0.12, n: VIEW.n + 0.12 };
const ZOOM = 10;
const DOWNSAMPLE = 3; // ~230 m cells
const INTERVAL = 200; // metres between contours
const TOLERANCE = 0.0012; // simplification, degrees (~110 m)

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const TILE = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

async function cached(name, url) {
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file);
}

/* ---------- geometry helpers ---------- */
const round = (n) => Math.round(n * 1e4) / 1e4;
const inside = ([x, y], b, pad = 0) => x >= b.w - pad && x <= b.e + pad && y >= b.s - pad && y <= b.n + pad;

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  // closed ring: the baseline would be a single point, so split at the farthest vertex
  const [fx, fy] = pts[0];
  const [lx, ly] = pts[pts.length - 1];
  if (fx === lx && fy === ly) {
    let k = 1;
    for (let i = 1; i < pts.length - 1; i++) if (Math.hypot(pts[i][0] - fx, pts[i][1] - fy) > Math.hypot(pts[k][0] - fx, pts[k][1] - fy)) k = i;
    return [...simplify(pts.slice(0, k + 1), tol), ...simplify(pts.slice(k), tol).slice(1)];
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Split a line into the runs that fall inside the view (keeping one point either side). */
function clipLine(pts, b = VIEW, pad = 0.05) {
  const runs = [];
  let run = [];
  pts.forEach((p, i) => {
    const on = inside(p, b, pad) || (pts[i + 1] && inside(pts[i + 1], b, pad)) || (pts[i - 1] && inside(pts[i - 1], b, pad));
    if (on) run.push(p);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  });
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length > 1);
}

const tidy = (line, tol = TOLERANCE) => simplify(line, tol).map(([x, y]) => [round(x), round(y)]);

function linesOf(geom) {
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  if (geom.type === "Polygon") return geom.coordinates;
  if (geom.type === "MultiPolygon") return geom.coordinates.flat();
  return [];
}

async function ne(layer) {
  return JSON.parse(await cached(`${layer}.geojson`, `${NE}/${layer}.geojson`));
}

function touching(fc) {
  return fc.features.filter((f) => f.geometry && linesOf(f.geometry).some((l) => l.some((p) => inside(p, VIEW, 0.1))));
}

/* ---------- elevation ---------- */
const lng2x = (lng, z) => ((lng + 180) / 360) * 2 ** z;
const lat2y = (lat, z) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z;
const x2lng = (x, z) => (x / 2 ** z) * 360 - 180;
const y2lat = (y, z) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

async function elevation() {
  const x0 = Math.floor(lng2x(DEM.w, ZOOM));
  const x1 = Math.floor(lng2x(DEM.e, ZOOM));
  const y0 = Math.floor(lat2y(DEM.n, ZOOM));
  const y1 = Math.floor(lat2y(DEM.s, ZOOM));
  const W = (x1 - x0 + 1) * 256;
  const H = (y1 - y0 + 1) * 256;
  const full = new Float32Array(W * H);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const png = PNG.sync.read(await cached(`t${ZOOM}-${tx}-${ty}.png`, TILE(ZOOM, tx, ty)));
      for (let py = 0; py < 256; py++) {
        for (let px = 0; px < 256; px++) {
          const i = (py * 256 + px) * 4;
          const h = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
          full[((ty - y0) * 256 + py) * W + (tx - x0) * 256 + px] = h;
        }
      }
    }
  }
  // box-downsample, then a light blur so contours read as smooth lines
  const w = Math.floor(W / DOWNSAMPLE);
  const h = Math.floor(H / DOWNSAMPLE);
  let grid = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < DOWNSAMPLE; dy++) for (let dx = 0; dx < DOWNSAMPLE; dx++) s += full[(y * DOWNSAMPLE + dy) * W + x * DOWNSAMPLE + dx];
      grid[y * w + x] = s / DOWNSAMPLE ** 2;
    }
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float64Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
              s += grid[yy * w + xx];
              n++;
            }
          }
        next[y * w + x] = s / n;
      }
    grid = next;
  }
  // grid cell → lng/lat (cell centres)
  const toLngLat = ([gx, gy]) => [x2lng(x0 + (gx * DOWNSAMPLE) / 256, ZOOM), y2lat(y0 + (gy * DOWNSAMPLE) / 256, ZOOM)];
  const sample = (lng, lat) => {
    const gx = Math.round(((lng2x(lng, ZOOM) - x0) * 256) / DOWNSAMPLE);
    const gy = Math.round(((lat2y(lat, ZOOM) - y0) * 256) / DOWNSAMPLE);
    return grid[gy * w + gx];
  };
  return { grid, w, h, toLngLat, sample };
}

/* ---------- build ---------- */
const dem = await elevation();
let max = -Infinity;
for (const v of dem.grid) max = Math.max(max, v);
const thresholds = [];
for (let t = INTERVAL * 2; t < max; t += INTERVAL) thresholds.push(t);

const contourLevels = contours()
  .size([dem.w, dem.h])
  .smooth(true)
  .thresholds(thresholds)(Array.from(dem.grid))
  .map((mp) => {
    const lines = [];
    for (const poly of mp.coordinates)
      for (const ring of poly) {
        const ll = ring.map(dem.toLngLat);
        for (const run of clipLine(ll, VIEW, 0.02)) {
          const t = tidy(run);
          // compact: integer pairs in 1e-4° offsets from the view's SW corner, delta-encoded after the first
          if (t.length > 3) {
            const ints = t.map(([x, y]) => [Math.round((x - VIEW.w) * 1e4), Math.round((y - VIEW.s) * 1e4)]);
            lines.push(ints.flatMap(([x, y], k) => (k ? [x - ints[k - 1][0], y - ints[k - 1][1]] : [x, y])));
          }
        }
      }
    return { elev: mp.value, lines };
  })
  .filter((l) => l.lines.length);

const lakes = touching(await ne("ne_10m_lakes"))
  .concat(touching(await ne("ne_10m_lakes_north_america")))
  .map((f) => ({ name: f.properties.name, rings: linesOf(f.geometry).map((r) => tidy(r, 0.0004)) }));

const riverNames = new Set();
const rivers = touching(await ne("ne_10m_rivers_north_america"))
  .map((f) => ({ name: (f.properties.label || f.properties.name || "").replace(/\s+/g, " ").trim(), lines: linesOf(f.geometry).flatMap((l) => clipLine(l)).map((l) => tidy(l, 0.0006)) }))
  .filter((r) => r.lines.length)
  .map((r) => {
    // label each river once (on its longest piece)
    const label = r.name && !riverNames.has(r.name) ? (riverNames.add(r.name), r.name) : "";
    return { name: label, lines: r.lines };
  });

const ROAD_LABEL = { 80: "I-80", 50: "US-50", 395: "US-395", 120: "CA-120", 88: "CA-88", 41: "CA-41", 140: "CA-140", 108: "CA-108", 49: "CA-49", 20: "CA-20" };
const roads = touching(await ne("ne_10m_roads"))
  .filter((f) => ROAD_LABEL[f.properties.name])
  .map((f) => ({
    ref: ROAD_LABEL[f.properties.name],
    major: f.properties.type === "Major Highway",
    lines: linesOf(f.geometry).flatMap((l) => clipLine(l)).map((l) => tidy(l, 0.0006)),
  }))
  .filter((r) => r.lines.length);

const parks = touching(await ne("ne_10m_parks_and_protected_lands_area")).map((f) => ({
  name: f.properties.unit_name || f.properties.name,
  rings: linesOf(f.geometry).map((r) => tidy(r, 0.0006)),
}));

const states = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/us-atlas/states-10m.json")));
const border = mesh(states, states.objects.states, (a, b) => a !== b && [a.id, b.id].includes("06") && [a.id, b.id].includes("32"));
const stateLine = linesOf(border).flatMap((l) => clipLine(l)).map((l) => tidy(l, 0.0006));

const out = {
  source: "Natural Earth 10m; Terrain Tiles (Mapzen/AWS); us-atlas. Built by scripts/build-sierra-map.mjs.",
  view: [VIEW.w, VIEW.s, VIEW.e, VIEW.n],
  interval: INTERVAL,
  /** contour lines are flat [x, y, dx, dy, …] integers (1e-4°): first point offset from view[0],view[1], then deltas */
  contours: contourLevels,
  lakes,
  rivers,
  roads,
  parks,
  stateLine,
};
fs.writeFileSync(OUT, JSON.stringify(out));

const pts = contourLevels.reduce((a, l) => a + l.lines.reduce((b, x) => b + x.length / 2, 0), 0);
console.log(`max elevation ${Math.round(max)} m; ${contourLevels.length} contour levels, ${pts} points`);
console.log(`lakes: ${lakes.map((l) => l.name)}; rivers: ${rivers.length}; roads: ${roads.map((r) => r.ref)}; parks: ${parks.map((p) => p.name)}`);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} kB)`);
// sanity: elevations at known places
for (const [n, lng, lat] of [["Yosemite Valley", -119.566, 37.739], ["Tuolumne Meadows", -119.358, 37.874], ["Lake Tahoe", -120.04, 39.09]])
  console.log(`  ${n}: ~${Math.round(dem.sample(lng, lat))} m`);
