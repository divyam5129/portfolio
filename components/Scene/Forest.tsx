"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { treeSpots } from "./world";

const GREENS = ["#1f5a3c", "#2b6e47", "#3a7d3f", "#245a43", "#2f6b3a"].map((c) => new THREE.Color(c));
const AUTUMN = ["#c27a2c", "#d4a03a", "#a8552e"].map((c) => new THREE.Color(c));

/** Low-poly pines, one instanced draw call. */
export default function Forest({ count = 460 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => treeSpots(count), [count]);

  const geometry = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 5, 1, true).translate(0, 0.2, 0);
    const low = new THREE.ConeGeometry(0.42, 0.95, 7, 1, true).translate(0, 0.75, 0);
    const high = new THREE.ConeGeometry(0.3, 0.75, 7, 1, true).translate(0, 1.25, 0);
    const parts = [trunk, low, high].map((g) => g.toNonIndexed());
    // per-vertex shade: trunk dark, top cone lighter (fake ambient occlusion)
    const shades = [0.35, 0.85, 1.05];
    parts.forEach((g, i) => {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3).fill(shades[i]);
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    });
    return mergeGeometries(parts)!;
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach((s, i) => {
      o.position.set(s.x, s.y - 0.05, s.z);
      o.rotation.set(0, s.tint * 6.28, 0);
      o.scale.setScalar(s.s * 1.35);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const autumn = s.tint > 0.92;
      const palette = autumn ? AUTUMN : GREENS;
      m.setColorAt(i, palette[Math.floor((s.tint * 97) % palette.length)]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spots]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, spots.length]} frustumCulled={false}>
      <meshLambertMaterial vertexColors flatShading />
    </instancedMesh>
  );
}
