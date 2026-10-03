import * as THREE from "three";
import { scrollStore } from "@/lib/gsap";
import type { RGB } from "@/lib/timeOfDay";

/**
 * Shared, per-frame lighting state derived from the time-of-day palette.
 * Colours are stored linear (THREE.Color from sRGB), so every custom shader
 * computes in linear space and ends with <colorspace_fragment>.
 */
export const atmo = {
  skyTop: new THREE.Color(),
  skyMid: new THREE.Color(),
  horizon: new THREE.Color(),
  sun: new THREE.Color(),
  ambient: new THREE.Color(),
  accent: new THREE.Color(),
  sunDir: new THREE.Vector3(),
  lightDir: new THREE.Vector3(),
  light: 1,
  stars: 0,
  aurora: 0,
  glow: 0,
  sunVisible: 1,
};

const SUN_AZIMUTH = new THREE.Vector2(-0.55, -0.84).normalize(); // rises behind the back range
const MOON_DIR = new THREE.Vector3(0.35, 0.5, -0.8).normalize();
const set = (c: THREE.Color, v: RGB) => c.setRGB(v[0], v[1], v[2], THREE.SRGBColorSpace);

export function updateAtmosphere() {
  const p = scrollStore.palette;
  set(atmo.skyTop, p.skyTop);
  set(atmo.skyMid, p.skyMid);
  set(atmo.horizon, p.horizon);
  set(atmo.sun, p.sun);
  set(atmo.ambient, p.ambient);
  set(atmo.accent, p.accent);
  const e = p.sunElevation;
  const h = Math.sqrt(Math.max(0, 1 - e * e));
  atmo.sunDir.set(SUN_AZIMUTH.x * h, e, SUN_AZIMUTH.y * h).normalize();
  atmo.sunVisible = THREE.MathUtils.smoothstep(e, -0.12, 0.02);
  // light comes from the sun by day and the moon by night
  atmo.lightDir
    .copy(atmo.sunDir)
    .setY(Math.max(0.12, atmo.sunDir.y))
    .normalize()
    .lerp(MOON_DIR, 1 - atmo.sunVisible)
    .normalize();
  atmo.light = p.light;
  atmo.stars = p.stars;
  atmo.aurora = p.aurora;
  atmo.glow = p.glow;
}

export const MOON = MOON_DIR;

/** GLSL helpers shared by several shaders. */
export const glslNoise = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm2(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return s;
  }
`;
