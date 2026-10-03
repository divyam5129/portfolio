"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "./world";

const COUNT = 14;
const LABELS = ["24", "31", "42", "48", "07", "13", "56", "19"];

function makeLabelTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext("2d")!;
  const mono = getComputedStyle(document.body).getPropertyValue("--font-jetbrains").trim() || "ui-monospace, monospace";
  ctx.font = `500 26px ${mono}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 6, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

const vertex = /* glsl */ `
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Iridescent, faceted crystal: thin-film colour shifts with the viewing angle.
const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uHue;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vec3 N = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 V = normalize(vView);
    float f = 1.0 - abs(dot(N, V));
    vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + f * 1.4 + uTime * 0.04 + uHue));
    vec3 col = mix(irid * 0.35, irid * 1.25, f);
    col += pow(f, 4.0) * 1.6;
    float a = 0.42 + 0.55 * f;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

type Item = {
  geo: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  base: THREE.Vector3;
  scale: number;
  speed: number;
  phase: number;
  hue: number;
  label?: THREE.Texture;
};

/** Floating iridescent crystals with tiny numeric labels (Igloo-style diagram markers). */
export default function Wireframe() {
  const group = useRef<THREE.Group>(null);

  const items = useMemo<Item[]>(() => {
    const shapes = [new THREE.OctahedronGeometry(0.6), new THREE.IcosahedronGeometry(0.55), new THREE.TetrahedronGeometry(0.7)];
    const edges = shapes.map((g) => new THREE.EdgesGeometry(g));
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: COUNT }, (_, i) => {
      const x = (rnd() - 0.5) * 46;
      const z = (rnd() - 0.5) * 46;
      const y = heightAt(x, z) + 3 + rnd() * 5;
      return {
        geo: shapes[i % shapes.length],
        edges: edges[i % shapes.length],
        base: new THREE.Vector3(x, y, z),
        scale: 0.35 + rnd() * 0.6,
        speed: 0.15 + rnd() * 0.3,
        phase: rnd() * Math.PI * 2,
        hue: rnd(),
        label: i < LABELS.length ? makeLabelTexture(LABELS[i]) : undefined,
      };
    });
  }, []);

  const uniforms = useMemo(() => items.map((it) => ({ uTime: { value: 0 }, uHue: { value: it.hue } })), [items]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.forEach((u) => (u.uTime.value = t));
    group.current?.children.forEach((child, i) => {
      const it = items[i];
      child.position.set(
        it.base.x + Math.sin(t * it.speed * 0.5 + it.phase) * 0.6,
        it.base.y + Math.sin(t * it.speed + it.phase) * 0.4,
        it.base.z + Math.cos(t * it.speed * 0.4 + it.phase) * 0.6,
      );
      const shape = child.children[0];
      const wire = child.children[1];
      if (shape && wire) {
        shape.rotation.set(t * it.speed * 0.3 + it.phase, t * it.speed * 0.2, 0);
        wire.rotation.copy(shape.rotation);
      }
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={i} position={it.base}>
          <mesh geometry={it.geo} scale={it.scale}>
            <shaderMaterial
              vertexShader={vertex}
              fragmentShader={fragment}
              uniforms={uniforms[i]}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments geometry={it.edges} scale={it.scale * 1.002}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
          </lineSegments>
          {it.label && (
            <sprite position={[it.scale * 1.1, it.scale * 0.8, 0]} scale={[0.8, 0.3, 1]}>
              <spriteMaterial map={it.label} transparent depthWrite={false} opacity={0.85} />
            </sprite>
          )}
        </group>
      ))}
    </group>
  );
}
