import * as THREE from "three";

/* ---------- deterministic 2D simplex noise ---------- */
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const grad = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const perm = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

function simplex2(x: number, y: number) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  let n = 0;
  const corner = (gx: number, gy: number, g: number) => {
    let tt = 0.5 - gx * gx - gy * gy;
    if (tt < 0) return 0;
    tt *= tt;
    const gr = grad[g % 8];
    return tt * tt * (gr[0] * gx + gr[1] * gy);
  };
  n += corner(x0, y0, perm[ii + perm[jj]]);
  n += corner(x1, y1, perm[ii + i1 + perm[jj + j1]]);
  n += corner(x2, y2, perm[ii + 1 + perm[jj + 1]]);
  return 70 * n; // -1..1
}

function fbm(x: number, y: number) {
  let a = 0.5;
  let f = 1;
  let sum = 0;
  for (let o = 0; o < 5; o++) {
    sum += a * simplex2(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return sum;
}

/* ---------- world layout ---------- */
export const TERRAIN_SIZE = 84;
// 136² × 2 = 36,992 triangles; trees and water keep the total under 60k
export const TERRAIN_SEGMENTS = 136;
export const MAX_HEIGHT = 14;

/** The hilltop the camera frames (x, z). Height is solved from the terrain. */
export const KNOLL_XZ = new THREE.Vector2(0, -2);

/** Alpine lake in the valley behind the hilltop. */
export const LAKE = { x: -18, z: -12, r: 7, y: 0.15 };

function rawHeight(x: number, z: number) {
  // ridge running diagonally + layered noise, with mountains far back (−z)
  const ridge = Math.exp(-Math.pow((x * 0.55 + z * 0.35 + 2) / 9, 2)) * 2.6;
  const peaks = Math.max(0, fbm(x * 0.045 + 3.1, z * 0.045 - 1.7)) * 6;
  const hills = fbm(x * 0.09, z * 0.09) * 1.2;
  const backRange = THREE.MathUtils.smoothstep(-z, 10, 36) * 9;
  // the valley toward the camera side (+x, +z) stays low and open
  const valley = THREE.MathUtils.smoothstep(x + z, 4, 22) * 2.2;
  return ridge + peaks + hills + backRange - valley;
}

let _summit: number | null = null;
function summitHeight() {
  if (_summit === null) _summit = rawHeight(KNOLL_XZ.x, KNOLL_XZ.y) + 1.4;
  return _summit;
}

/** Terrain height at world (x, z). */
export function heightAt(x: number, z: number) {
  let h = rawHeight(x, z);

  // lake: a bowl below the water line, with a rim that always sits above it
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r + 4) {
    const rim = LAKE.y + 0.35 + THREE.MathUtils.smoothstep(dl, LAKE.r, LAKE.r + 4) * 0.4;
    const bed = LAKE.y - 1.4;
    const inside = 1 - THREE.MathUtils.smoothstep(dl, LAKE.r * 0.55, LAKE.r);
    h = Math.max(h, dl > LAKE.r - 0.4 ? rim * (1 - THREE.MathUtils.smoothstep(dl, LAKE.r + 1.5, LAKE.r + 4)) + h * THREE.MathUtils.smoothstep(dl, LAKE.r + 1.5, LAKE.r + 4) : h);
    h = THREE.MathUtils.lerp(h, bed, inside);
  }

  // hilltop: flat pad easing into a broad rounded knoll
  const d = Math.hypot(x - KNOLL_XZ.x, z - KNOLL_XZ.y);
  const knoll = 1 - THREE.MathUtils.smoothstep(d, 1.6, 7.5);
  const lifted = Math.max(h, THREE.MathUtils.lerp(h, summitHeight(), knoll));
  const pad = THREE.MathUtils.smoothstep(d, 1.2, 3.4);
  return THREE.MathUtils.lerp(summitHeight(), lifted, pad);
}

export function knollPosition() {
  return new THREE.Vector3(KNOLL_XZ.x, heightAt(KNOLL_XZ.x, KNOLL_XZ.y), KNOLL_XZ.y);
}

/* ---------- camera path for the Experience section: valley → ridge (not drawn) ---------- */
const TRAIL_XZ: [number, number][] = [
  [18, 26],
  [12, 21],
  [13, 14],
  [7, 10],
  [9, 4],
  [4, 1.5],
  [1.4, -1.2],
];

let _trail: THREE.CatmullRomCurve3 | null = null;
export function trailCurve() {
  if (_trail) return _trail;
  const pts = TRAIL_XZ.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.06, z));
  const rough = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  // resample and re-drape onto the terrain so the line hugs the ground
  const draped = rough.getSpacedPoints(220).map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.z) + 0.08, p.z));
  _trail = new THREE.CatmullRomCurve3(draped, false, "centripetal");
  return _trail;
}


/* ---------- trees ---------- */
export type TreeSpot = { x: number; y: number; z: number; s: number; tint: number };

let _trees: TreeSpot[] | null = null;
export function treeSpots(max = 520): TreeSpot[] {
  if (_trees) return _trees.slice(0, max);
  const trail = trailCurve().getSpacedPoints(120);
  // keep the camera's line of sight clear: no trees right next to any camera pose
  const poses = cameraPoses().pos;
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: TreeSpot[] = [];
  let guard = 0;
  while (out.length < 520 && guard++ < 20000) {
    const x = (rnd() - 0.5) * 70;
    const z = (rnd() - 0.5) * 70;
    const h = heightAt(x, z);
    if (h < LAKE.y + 0.5 || h > 8.2) continue;
    // forests grow in patches
    if (fbm(x * 0.06 + 11, z * 0.06 - 4) < -0.05) continue;
    // keep slopes gentle-ish
    const slope = Math.abs(heightAt(x + 0.6, z) - h) + Math.abs(heightAt(x, z + 0.6) - h);
    if (slope > 0.9) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1.2) continue;
    if (Math.hypot(x - KNOLL_XZ.x, z - KNOLL_XZ.y) < 5.5) continue;
    if (poses.some((p) => Math.hypot(p.x - x, p.z - z) < 7.5 && p.y < h + 6)) continue;
    // the slope between the hero camera and the hilltop stays open
    if (x > 0 && z > -3 && x < 12 && z < 12 && Math.hypot(x - KNOLL_XZ.x, z - KNOLL_XZ.y) < 13) continue;
    let nearTrail = false;
    for (let i = 0; i < trail.length; i += 2) {
      if (Math.hypot(trail[i].x - x, trail[i].z - z) < 1.6) {
        nearTrail = true;
        break;
      }
    }
    if (nearTrail) continue;
    out.push({ x, y: h, z, s: 0.55 + rnd() * 0.75, tint: rnd() });
  }
  _trees = out;
  return out.slice(0, max);
}

/* ---------- camera poses, one per section (same order as site.sections) ---------- */
export function cameraPoses() {
  const knoll = knollPosition();
  const trail = trailCurve();
  const head = trail.getPointAt(0);
  const lake = new THREE.Vector3(LAKE.x, LAKE.y, LAKE.z);
  const pos = [
    // hero: on the ridge, looking up into the sunrise sky (the Golden Gate drawing sits on top)
    new THREE.Vector3(knoll.x + 6.5, knoll.y + 3.2, knoll.z + 9.5),
    // about: dolly forward + lower toward the ridge
    new THREE.Vector3(knoll.x + 5.6, knoll.y + 1.9, knoll.z + 7.6),
    // now: above the lake shore, looking across the water to the peaks
    new THREE.Vector3(lake.x + 9, lake.y + 6.2, lake.z + 14),
    // experience: down at the trailhead (rig blends onto the trail itself)
    new THREE.Vector3(head.x + 2.5, head.y + 2.4, head.z + 3.5),
    // field guide: rise over the ridge toward the high peaks
    new THREE.Vector3(9, knoll.y + 5.5, 1),
    // trail map: near top-down (the 2D map covers it)
    new THREE.Vector3(6, 46, 12.5),
    // gallery: low, tilted up toward the sunset sky
    new THREE.Vector3(4, knoll.y + 1.4, 14),
    // skills: drifting along the ridge at dusk
    new THREE.Vector3(-9, knoll.y + 4, 9),
    // contact: pull back, wide over the hilltop and lake at night
    new THREE.Vector3(knoll.x + 13, knoll.y + 7.5, knoll.z + 16),
  ];
  const look = [
    knoll.clone().add(new THREE.Vector3(-16, 15, -14)),
    knoll.clone().add(new THREE.Vector3(-1.5, 0.4, -2)),
    lake.clone().add(new THREE.Vector3(-3, 2.2, -12)),
    trail.getPointAt(0.08).add(new THREE.Vector3(0, 0.6, 0)),
    new THREE.Vector3(-8, 9, -32),
    new THREE.Vector3(6, 0, 11),
    new THREE.Vector3(-2, knoll.y + 10, -30),
    knoll.clone().add(new THREE.Vector3(6, 0, -6)),
    knoll.clone().add(new THREE.Vector3(-1.5, 2.6, -3)),
  ];
  return { pos, look };
}
