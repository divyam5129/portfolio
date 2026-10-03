"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { firePosition, POST_T, TENT_YAW, tentPosition, trailCurve } from "./world";
import { scrollStore } from "@/lib/gsap";
import { sectionIndex } from "@/data/site";
import { sectionPhase } from "./phase";
import { atmo } from "./atmosphere";

const TRAIL = new THREE.Color("#ff6a2b");
const LINE = new THREE.Color("#e8e6df");
const EXPERIENCE = sectionIndex("experience");

/** The hero object: a procedural low-poly tent, orange fly, glowing from inside at night. */
export function Tent() {
  const tent = useMemo(() => tentPosition(), []);
  const flyMat = useRef<THREE.MeshStandardMaterial>(null);
  const doorMat = useRef<THREE.MeshBasicMaterial>(null);
  const seamMat = useRef<THREE.LineBasicMaterial>(null);

  const { body, door, edges, seam, ground } = useMemo(() => {
    const w = 0.85;
    const h = 1.05;
    const l = 1.1;
    const v = [
      [-w, 0, -l], [w, 0, -l], [0, h, -l],
      [-w, 0, l], [w, 0, l], [0, h, l],
    ];
    const tris = [[0, 2, 1], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 4]];
    const positions: number[] = [];
    tris.forEach((t) => t.forEach((i) => positions.push(...v[i])));
    const body = new THREE.BufferGeometry();
    body.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    body.computeVertexNormals();
    // the door: front triangle, lit from inside
    const door = new THREE.BufferGeometry();
    door.setAttribute("position", new THREE.Float32BufferAttribute([-w * 0.92, 0.01, l, w * 0.92, 0.01, l, 0, h * 0.94, l], 3));
    const edges = new THREE.EdgesGeometry(body);
    const seam = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, h + 0.004, -l - 0.05),
      new THREE.Vector3(0, h + 0.004, l + 0.05),
      new THREE.Vector3(0, h, l + 0.005),
      new THREE.Vector3(0, 0.02, l + 0.005),
    ]);
    const ground = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, h, l + 0.05), new THREE.Vector3(0, 0, l + 0.9),
      new THREE.Vector3(0, h, -l - 0.05), new THREE.Vector3(0, 0, -l - 0.9),
    ]);
    return { body, door, edges, seam, ground };
  }, []);

  const warm = useMemo(() => new THREE.Color("#ffb45c"), []);
  useFrame((state) => {
    const g = atmo.glow;
    const flicker = 0.85 + Math.sin(state.clock.elapsedTime * 9.0) * 0.05 + Math.sin(state.clock.elapsedTime * 23.0) * 0.04;
    if (flyMat.current) flyMat.current.emissiveIntensity = 0.05 + g * 0.55 * flicker;
    if (doorMat.current) doorMat.current.color.copy(warm).multiplyScalar(0.15 + g * 2.2 * flicker);
    if (seamMat.current) seamMat.current.color.copy(TRAIL).multiplyScalar(1 + g * 1.5);
  });

  return (
    <group position={tent} rotation={[0, TENT_YAW, 0]} scale={1.35}>
      <mesh geometry={body} castShadow={false}>
        <meshStandardMaterial
          ref={flyMat}
          color="#e2672e"
          roughness={0.75}
          metalness={0}
          emissive="#ff8a3d"
          emissiveIntensity={0.05}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={door}>
        <meshBasicMaterial ref={doorMat} color="#2a1608" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#ffd3b0" transparent opacity={0.45} />
      </lineSegments>
      <lineSegments geometry={seam}>
        <lineBasicMaterial ref={seamMat} color={TRAIL} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={ground}>
        <lineBasicMaterial color={LINE} transparent opacity={0.35} />
      </lineSegments>
    </group>
  );
}

/* ---------- campfire ---------- */
const flameVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // billboard: keep the quad facing the camera
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.0);
    mv.xy += position.xy * scale.xy;
    gl_Position = projectionMatrix * mv;
  }
`;
const flameFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uPower;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 2.2 + uSeed * 10.0;
    float distort = (n(vec2(uv.x * 4.0, uv.y * 3.0 - t)) - 0.5) * 0.35 * uv.y;
    float x = (uv.x - 0.5 + distort) * 2.0;
    float shape = 1.0 - smoothstep(0.0, 1.0, abs(x) / max(0.05, (1.0 - uv.y) * 0.95));
    shape *= smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y + n(vec2(uv.x * 6.0, -t)) * 0.3));
    vec3 col = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.75, 0.25), shape);
    col = mix(col, vec3(1.0, 0.95, 0.75), smoothstep(0.7, 1.0, shape) * (1.0 - uv.y));
    gl_FragColor = vec4(col * 2.4 * uPower, shape * uPower);
    #include <colorspace_fragment>
  }
`;

const glowFragment = /* glsl */ `
  uniform float uPower;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.4) * uPower;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`;

export function Campfire() {
  const pos = useMemo(() => firePosition(), []);
  const flames = useRef<THREE.ShaderMaterial[]>([]);
  const glow = useRef<THREE.ShaderMaterial>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const embers = useRef<THREE.Points>(null);

  const stones = useMemo(() => {
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return { x: Math.cos(a) * 0.42, z: Math.sin(a) * 0.42, s: 0.08 + rnd() * 0.05, r: rnd() * 3 };
    });
  }, []);

  const emberGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 46;
    const p = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      seeds[i] = Math.random();
      p[i * 3] = (Math.random() - 0.5) * 0.3;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);

  const flameUniforms = useMemo(
    () => [0, 1, 2].map((i) => ({ uTime: { value: 0 }, uSeed: { value: i * 0.37 }, uPower: { value: 1 } })),
    [],
  );
  const glowUniforms = useMemo(() => ({ uPower: { value: 0.5 }, uColor: { value: new THREE.Color("#ff7a2e") } }), []);
  const haloUniforms = useMemo(() => ({ uPower: { value: 0.5 }, uColor: { value: new THREE.Color("#ff9a4a") } }), []);
  const emberUniforms = useMemo(() => ({ uTime: { value: 0 }, uPower: { value: 1 } }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = atmo.glow;
    const power = 0.45 + g * 0.75;
    flameUniforms.forEach((u) => {
      u.uTime.value = t;
      u.uPower.value = power;
    });
    const flicker = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 27) * 0.07;
    glowUniforms.uPower.value = (0.25 + g * 1.1) * flicker;
    haloUniforms.uPower.value = (0.15 + g * 0.9) * flicker;
    emberUniforms.uTime.value = t;
    emberUniforms.uPower.value = 0.3 + g;
  });

  return (
    <group position={pos}>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, s.s * 0.5, s.z]} rotation={[s.r, s.r * 2, 0]} scale={s.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color="#6b6460" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} rotation={[0, 0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 5]} />
        <meshLambertMaterial color="#5a3a22" />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[0, -0.9, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 5]} />
        <meshLambertMaterial color="#4a2f1c" />
      </mesh>
      {/* ground glow */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 4.2]} />
        <shaderMaterial
          ref={glow}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={glowFragment}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* flames */}
      {flameUniforms.map((u, i) => (
        <mesh key={i} position={[(i - 1) * 0.08, 0.32, (i - 1) * 0.05]} scale={[0.42 - i * 0.06, 0.75 - i * 0.12, 1]}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={(el) => {
              if (el) flames.current[i] = el;
            }}
            vertexShader={flameVertex}
            fragmentShader={flameFragment}
            uniforms={u}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {/* air glow */}
      <mesh position={[0, 0.5, 0]} scale={[2.4, 2.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={halo}
          vertexShader={flameVertex}
          fragmentShader={glowFragment}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={embers} geometry={emberGeo} frustumCulled={false}>
        <shaderMaterial
          uniforms={emberUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={/* glsl */ `
            uniform float uTime;
            attribute float seed;
            varying float vA;
            void main() {
              float life = fract(uTime * (0.25 + seed * 0.3) + seed);
              vec3 p = position;
              p.y += life * (1.6 + seed);
              p.x += sin(life * 6.0 + seed * 20.0) * 0.18 * life;
              p.z += cos(life * 5.0 + seed * 13.0) * 0.18 * life;
              vA = (1.0 - life) * smoothstep(0.0, 0.1, life);
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = (2.0 + seed * 2.5) * (6.0 / -mv.z);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uPower;
            varying float vA;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float a = smoothstep(0.5, 0.0, length(c)) * vA * uPower;
              gl_FragColor = vec4(vec3(1.0, 0.55, 0.15) * 2.0 * a, a);
              #include <colorspace_fragment>
            }
          `}
        />
      </points>
    </group>
  );
}

/** The trail line plus marker posts (one per flowchart marker). */
export function Trail() {
  const line = useRef<THREE.Line>(null);
  const posts = useRef<(THREE.Mesh | null)[]>([]);
  const caps = useRef<(THREE.Mesh | null)[]>([]);
  const curve = useMemo(() => trailCurve(), []);
  const SEG = 400;

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(SEG)), [curve]);
  const postData = useMemo(() => POST_T.map((t) => curve.getPointAt(t)), [curve]);
  const lineObj = useMemo(() => {
    const l = new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({ color: new THREE.Color("#ff8a3d").multiplyScalar(1.4), dashSize: 0.24, gapSize: 0.14, toneMapped: false }),
    );
    l.computeLineDistances();
    l.geometry.setDrawRange(0, 2);
    return l;
  }, [geometry]);

  useFrame(() => {
    const { section, local } = sectionPhase(scrollStore.eased);
    let reveal = 0.08;
    if (section === EXPERIENCE - 1) reveal = 0.08 + local * 0.05;
    if (section === EXPERIENCE) reveal = 0.13 + scrollStore.experience * 0.87;
    if (section > EXPERIENCE) reveal = 1;
    const count = Math.max(2, Math.floor(reveal * SEG) + 1);
    if (line.current) {
      const cur = line.current.geometry.drawRange.count;
      line.current.geometry.setDrawRange(0, Math.round(cur + (count - cur) * 0.2));
    }
    postData.forEach((_, i) => {
      const m = posts.current[i];
      const cap = caps.current[i];
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      const on = section > EXPERIENCE || (section === EXPERIENCE && scrollStore.experience >= (i + 0.2) / POST_T.length);
      const k = (mat.userData.k ?? 0) + ((on ? 1 : 0) - (mat.userData.k ?? 0)) * 0.1;
      mat.userData.k = k;
      mat.color.copy(LINE).multiplyScalar(0.6).lerp(TRAIL, k).multiplyScalar(1 + k * 1.2);
      if (cap) {
        cap.rotation.y += 0.02;
        (cap.material as THREE.MeshBasicMaterial).color.copy(LINE).lerp(new THREE.Color("#ffd166"), k).multiplyScalar(1 + k * 1.5);
      }
    });
  });

  return (
    <group>
      <primitive object={lineObj} ref={line} />
      {postData.map((p, i) => (
        <group key={i} position={p}>
          <mesh ref={(el) => { posts.current[i] = el; }} position={[0, 0.45, 0]}>
            <boxGeometry args={[0.05, 0.9, 0.05]} />
            <meshBasicMaterial color={LINE} toneMapped={false} />
          </mesh>
          <mesh ref={(el) => { caps.current[i] = el; }} position={[0, 1.0, 0]}>
            <octahedronGeometry args={[0.1, 0]} />
            <meshBasicMaterial color={LINE} wireframe toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
