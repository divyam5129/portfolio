"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAKE } from "./world";
import { atmo, glslNoise } from "./atmosphere";

const vertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uSunVis;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uRadius;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${glslNoise}

  void main() {
    vec2 p = vWorld.xz;
    // ripples
    float e = 0.15;
    float t = uTime * 0.35;
    float h0 = fbm2(p * 0.9 + vec2(t, t * 0.6));
    float hx = fbm2((p + vec2(e, 0.0)) * 0.9 + vec2(t, t * 0.6));
    float hz = fbm2((p + vec2(0.0, e)) * 0.9 + vec2(t, t * 0.6));
    vec3 N = normalize(vec3((h0 - hx) * 1.6, 1.0, (h0 - hz) * 1.6));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 0.6, R.y));
    vec3 deep = mix(vec3(0.004, 0.03, 0.05), uTop * 0.35, 0.5);
    vec3 col = mix(deep, sky, 0.25 + 0.75 * fres);
    // sun glitter
    float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 220.0);
    col += uSun * spec * 6.0 * uSunVis;
    // soft shoreline
    float d = length(p - uCenter.xz);
    float alpha = 1.0 - smoothstep(uRadius - 1.2, uRadius + 0.3, d);
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

export default function Water() {
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uSun: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3() },
          uSunVis: { value: 1 },
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector3(LAKE.x, LAKE.y, LAKE.z) },
          uRadius: { value: LAKE.r + 0.6 },
        },
      ]),
    [],
  );

  useFrame((state) => {
    uniforms.uTop.value.copy(atmo.skyTop);
    uniforms.uHorizon.value.copy(atmo.horizon);
    uniforms.uSun.value.copy(atmo.sun);
    uniforms.uSunDir.value.copy(atmo.sunDir);
    uniforms.uSunVis.value = atmo.sunVisible;
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[LAKE.x, LAKE.y, LAKE.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[LAKE.r + 0.9, 48]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent fog depthWrite={false} />
    </mesh>
  );
}
