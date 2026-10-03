"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraPoses, trailCurve } from "./world";
import { scrollStore } from "@/lib/gsap";
import { sectionIndex } from "@/data/site";
import { sectionPhase } from "./phase";
import { atmo, updateAtmosphere } from "./atmosphere";

const DEG = Math.PI / 180;
const HERO = sectionIndex("hero");
const EXPERIENCE = sectionIndex("experience");
// fog distances per section (same order as site.sections)
const FOG_NEAR = [18, 18, 22, 26, 24, 40, 12, 14, 18];
const FOG_FAR = [85, 85, 90, 95, 95, 120, 60, 72, 85];

/**
 * Camera follows a CatmullRomCurve3 through one pose per section; the look-at
 * target follows its own curve. During Experience it blends onto the trail.
 * Also owns the per-frame atmosphere update and the two scene lights.
 */
export default function CameraRig() {
  const { camera, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);

  const { posCurve, lookCurve, trail, n } = useMemo(() => {
    const { pos, look } = cameraPoses();
    return {
      posCurve: new THREE.CatmullRomCurve3(pos, false, "centripetal", 0.5),
      lookCurve: new THREE.CatmullRomCurve3(look, false, "centripetal", 0.5),
      trail: trailCurve(),
      n: pos.length,
    };
  }, []);

  const tmp = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    tp: new THREE.Vector3(),
    tl: new THREE.Vector3(),
    side: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    parallax: new THREE.Vector2(),
  });

  useFrame((state, delta) => {
    const s = tmp.current;
    const reduced = scrollStore.reducedMotion;
    updateAtmosphere();

    const { section, local } = sectionPhase(scrollStore.eased);
    // ease within a section so the camera lingers at each pose
    const eased = local * local * (3 - 2 * local);
    const u = Math.min(1, (section + eased) / (n - 1));
    posCurve.getPoint(u, s.pos);
    lookCurve.getPoint(u, s.look);

    // Experience: ride the trail
    if (section === EXPERIENCE) {
      const w = THREE.MathUtils.smoothstep(local, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(local, 0.9, 1));
      const t = THREE.MathUtils.clamp(scrollStore.experience * 0.82, 0, 0.82);
      trail.getPointAt(t, s.tp);
      trail.getPointAt(Math.min(1, t + 0.12), s.tl);
      const tangent = trail.getTangentAt(t);
      s.side.crossVectors(tangent, s.up).normalize();
      s.tp.addScaledVector(s.side, 3.8).add(new THREE.Vector3(0, 2.9, 0)).addScaledVector(tangent, -2.6);
      s.tl.y += 0.5;
      s.pos.lerp(s.tp, w);
      s.look.lerp(s.tl, w);
    }

    // Hero idle orbit (±3°)
    if (section === HERO && !reduced) {
      const yaw = Math.sin(state.clock.elapsedTime * 0.18) * 3 * DEG * (1 - local);
      s.pos.sub(s.look).applyAxisAngle(s.up, yaw).add(s.look);
    }

    camera.position.copy(s.pos);
    camera.lookAt(s.look);

    // Mouse parallax ±1.5°
    if (!reduced) {
      const pk = 1 - Math.pow(1 - 0.06, delta * 60);
      s.parallax.x += (scrollStore.pointer.x - s.parallax.x) * pk;
      s.parallax.y += (scrollStore.pointer.y - s.parallax.y) * pk;
      camera.rotateY(-s.parallax.x * 1.5 * DEG);
      camera.rotateX(-s.parallax.y * 1.5 * DEG);
    }

    // Fog takes the horizon colour and breathes per section
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(atmo.horizon).lerp(atmo.skyMid, 0.25);
      const next = Math.min(section + 1, n - 1);
      const near = THREE.MathUtils.lerp(FOG_NEAR[section] ?? 16, FOG_NEAR[next] ?? 16, eased);
      const far = THREE.MathUtils.lerp(FOG_FAR[section] ?? 70, FOG_FAR[next] ?? 70, eased);
      fog.near += (near - fog.near) * 0.1;
      fog.far += (far - fog.far) * 0.1;
    }

    // Lights follow the sun (or moon)
    if (sun.current) {
      sun.current.position.copy(atmo.lightDir).multiplyScalar(40);
      sun.current.color.copy(atmo.sun);
      sun.current.intensity = atmo.light * 2.2;
    }
    if (amb.current) {
      amb.current.color.copy(atmo.ambient);
      amb.current.intensity = 1.1;
    }
  });

  return (
    <>
      <ambientLight ref={amb} intensity={1} />
      <directionalLight ref={sun} intensity={2} />
    </>
  );
}
