"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt, LAKE, MAX_HEIGHT, TERRAIN_SEGMENTS, TERRAIN_SIZE, firePosition } from "./world";
import { atmo, glslNoise } from "./atmosphere";

const vertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying float vH;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vH = position.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform float uLight;
  uniform vec3 uAmbient;
  uniform vec3 uSky;
  uniform vec3 uLineTint;
  uniform vec3 uFire;
  uniform vec3 uFirePos;
  uniform float uGlow;
  uniform float uDensity;
  uniform float uMaxH;
  uniform float uLakeY;
  varying float vH;
  varying vec3 vWorld;
  varying vec3 vNormal;
  #include <fog_pars_fragment>
  ${glslNoise}

  float contour(float v, float width) {
    float f = fract(v);
    float d = min(f, 1.0 - f);
    float w = max(fwidth(v) * width, 1e-4);
    return 1.0 - smoothstep(0.0, w, d);
  }

  // sRGB-authored palette, converted to linear for lighting
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

  void main() {
    vec3 N = normalize(vNormal);
    float slope = 1.0 - N.y;
    float n = fbm2(vWorld.xz * 0.18);
    float h = vH + (n - 0.5) * 1.2;

    vec3 sand   = lin(vec3(0.80, 0.70, 0.50));
    vec3 meadow = lin(vec3(0.55, 0.62, 0.30));
    vec3 grass  = lin(vec3(0.30, 0.50, 0.26));
    vec3 forest = lin(vec3(0.14, 0.33, 0.22));
    vec3 dry    = lin(vec3(0.72, 0.60, 0.34));
    vec3 rock   = lin(vec3(0.46, 0.41, 0.40));
    vec3 snow   = lin(vec3(0.96, 0.97, 1.0));

    vec3 base = mix(sand, meadow, smoothstep(uLakeY + 0.15, uLakeY + 0.8, vH));
    base = mix(base, grass, smoothstep(0.8, 2.2, h));
    base = mix(base, dry, smoothstep(0.55, 0.8, n) * 0.55); // golden California grass patches
    base = mix(base, forest, smoothstep(2.6, 4.2, h) * 0.55);
    base = mix(base, rock, smoothstep(5.6, 7.6, h));
    base = mix(base, rock, smoothstep(0.32, 0.6, slope));
    float snowLine = smoothstep(8.6, 10.2, h) * (1.0 - smoothstep(0.42, 0.7, slope));
    base = mix(base, snow, snowLine);

    float diff = max(dot(N, normalize(uLightDir)), 0.0);
    vec3 col = base * (uAmbient * 0.55 + uSky * 0.22 * (0.5 + 0.5 * N.y));
    col += base * uLightColor * diff * uLight;
    // alpenglow: snow catches the sky colour
    col += snow * uLightColor * snowLine * 0.25 * uLight;

    // signature contour lines, tinted by the time of day
    float hn = vH / uMaxH;
    float minor = contour(hn * uDensity, 1.0);
    float major = contour(hn * uDensity / 5.0, 1.5);
    col = mix(col, uLineTint, minor * 0.16 + major * 0.28);

    // warm pool of firelight around the camp
    float dFire = length(vWorld.xz - uFirePos.xz);
    col += uFire * uGlow * 0.9 * exp(-dFire * 0.75);

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

type TerrainProps = {
  segments?: number;
  /** height function in world space (defaults to the mountain range) */
  heightFn?: (x: number, z: number) => number;
  width?: number;
  depth?: number;
  center?: [number, number];
  segmentsZ?: number;
  /** water level used for the sand band */
  waterY?: number;
};

export default function Terrain({
  segments = TERRAIN_SEGMENTS,
  heightFn = heightAt,
  width = TERRAIN_SIZE,
  depth = TERRAIN_SIZE,
  center = [0, 0],
  segmentsZ,
  waterY = LAKE.y,
}: TerrainProps) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth, segments, segmentsZ ?? segments);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightFn(pos.getX(i), pos.getZ(i)));
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, segmentsZ, width, depth]);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uLightDir: { value: new THREE.Vector3(0, 1, 0) },
          uLightColor: { value: new THREE.Color() },
          uLight: { value: 1 },
          uAmbient: { value: new THREE.Color() },
          uSky: { value: new THREE.Color() },
          uLineTint: { value: new THREE.Color() },
          uFire: { value: new THREE.Color("#ff7a2e") },
          uFirePos: { value: firePosition() },
          uGlow: { value: 0 },
          uDensity: { value: 16 },
          uMaxH: { value: MAX_HEIGHT },
          uLakeY: { value: waterY },
        },
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const tint = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const u = m.uniforms;
    u.uLightDir.value.copy(atmo.lightDir);
    u.uLightColor.value.copy(atmo.sun);
    u.uLight.value = atmo.light;
    u.uAmbient.value.copy(atmo.ambient);
    u.uSky.value.copy(atmo.skyMid);
    tint.copy(atmo.horizon).lerp(atmo.sun, 0.5).multiplyScalar(1.15);
    u.uLineTint.value.copy(tint);
    u.uGlow.value = atmo.glow;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} fog />
    </mesh>
  );
}
