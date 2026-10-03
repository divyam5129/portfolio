"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { atmo } from "./atmosphere";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed * 6.28) * 1.8 + uTime * 0.1;
    p.y += sin(uTime * (0.3 + aSeed * 0.4) + aSeed * 30.0) * 0.6;
    p.z += cos(uTime * 0.07 + aSeed * 12.0) * 1.8;
    p.x = mod(p.x + 30.0, 60.0) - 30.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 1.1) * (14.0 / max(4.0, -mv.z));
    float blink = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 40.0);
    vAlpha = smoothstep(60.0, 6.0, -mv.z) * (0.35 + aSeed * 0.5) * blink;
    vSeed = aSeed;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    vec3 col = mix(uColor, uColor2, step(0.6, vSeed));
    gl_FragColor = vec4(col * 1.6 * a, a);
    #include <colorspace_fragment>
  }
`;

/** Drifting motes: golden pollen by day, fireflies at night. */
export default function Particles({ count = 700 }: { count?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = 2 + Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.2 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#ffe08a") },
      uColor2: { value: new THREE.Color("#ffffff") },
    }),
    [],
  );

  const day = useMemo(() => new THREE.Color("#ffe6a0"), []);
  const night = useMemo(() => new THREE.Color("#c8ff6b"), []);
  useFrame((state) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = dpr;
    u.uColor.value.copy(day).lerp(night, atmo.glow);
    u.uColor2.value.copy(atmo.accent);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
