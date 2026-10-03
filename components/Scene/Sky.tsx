"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { atmo, glslNoise, MOON } from "./atmosphere";

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // always at the far plane
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform float uSunVis;
  uniform float uStars;
  uniform float uAurora;
  uniform float uTime;
  varying vec3 vDir;
  ${glslNoise}

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;

    // gradient: horizon → mid → top
    vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.26, y));
    col = mix(col, uTop, smoothstep(0.2, 0.85, y));
    // the horizon burns brighter on the sun's side
    float sunSide = max(dot(normalize(d.xz), normalize(uSunDir.xz)), 0.0);
    col += uSun * pow(sunSide, 3.0) * exp(-max(y, 0.0) * 7.0) * 0.35 * uSunVis;
    // below the horizon: deepen
    col = mix(col, uHorizon * 0.45, smoothstep(0.0, -0.3, y));

    // clouds: wispy streaks, lit by the sun colour
    if (y > 0.0) {
      vec2 uv = d.xz / (y + 0.18) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
      float c = fbm2(uv * 1.3);
      c = smoothstep(0.52, 0.85, c) * smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.35, 0.7, y));
      vec3 cloudCol = mix(uHorizon * 1.1, uSun * 1.2, 0.35 + 0.4 * sunSide) * (0.55 + 0.45 * uSunVis) + uTop * 0.1;
      col = mix(col, cloudCol, c * 0.55);
    }

    // sun disc + halo
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSun * (pow(sd, 32.0) * 0.6 + pow(sd, 6.0) * 0.12) * uSunVis;
    col = mix(col, uSun * 3.0, smoothstep(0.9992, 0.9996, sd) * uSunVis);

    // moon
    float moonVis = 1.0 - uSunVis;
    float md = max(dot(d, uMoonDir), 0.0);
    col += vec3(0.75, 0.8, 1.0) * pow(md, 80.0) * 0.4 * moonVis;
    col = mix(col, vec3(2.2, 2.25, 2.4), smoothstep(0.99955, 0.99975, md) * moonVis);

    // stars
    if (uStars > 0.001 && y > 0.0) {
      vec3 sp = d * 220.0;
      vec3 cell = floor(sp);
      float h = hash13(cell);
      vec3 f = fract(sp) - 0.5;
      float star = step(0.985, h) * smoothstep(0.22, 0.0, length(f));
      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 80.0);
      vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.7), fract(h * 37.0));
      col += sc * star * tw * uStars * smoothstep(0.0, 0.2, y) * 2.2;
    }

    // aurora curtains
    if (uAurora > 0.001 && y > 0.05) {
      float az = atan(d.z, d.x);
      float n = fbm2(vec2(az * 2.0, uTime * 0.05));
      float band = exp(-pow((y - 0.2 - 0.08 * sin(az * 3.0 + uTime * 0.08) - n * 0.08) * 6.0, 2.0));
      float streak = 0.55 + 0.45 * sin(az * 55.0 + n * 9.0 + uTime * 0.25);
      vec3 ac = mix(vec3(0.1, 1.0, 0.6), vec3(0.55, 0.3, 1.0), smoothstep(0.25, 0.55, y));
      col += ac * band * streak * uAurora * 0.9;
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function Sky() {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
      uMoonDir: { value: MOON.clone() },
      uSunVis: { value: 1 },
      uStars: { value: 0 },
      uAurora: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    const u = uniforms;
    u.uTop.value.copy(atmo.skyTop);
    u.uMid.value.copy(atmo.skyMid);
    u.uHorizon.value.copy(atmo.horizon);
    u.uSun.value.copy(atmo.sun);
    u.uSunDir.value.copy(atmo.sunDir);
    u.uSunVis.value = atmo.sunVisible;
    u.uStars.value = atmo.stars;
    u.uAurora.value = atmo.aurora;
    u.uTime.value = state.clock.elapsedTime;
    mesh.current?.position.copy(state.camera.position);
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[100, 32, 16]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
