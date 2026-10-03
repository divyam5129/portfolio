"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import Terrain from "./Terrain";
import Water from "./Water";
import Forest from "./Forest";
import Sky from "./Sky";
import { Campfire, Tent, Trail } from "./Tent";
import Wireframe from "./Wireframe";
import Particles from "./Particles";
import CameraRig from "./CameraRig";
import { scrollStore } from "@/lib/gsap";
import { setLoad } from "@/lib/loadStore";

/** Reports drei progress + first rendered frame to the loader. */
function LoadReporter() {
  const { progress, total } = useProgress();
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    setLoad({ assets: total === 0 ? 100 : progress });
  }, [progress, total]);
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setLoad({ sceneFrame: true }));
    });
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

/** In reduced motion we render on demand: re-render only when scroll changes. */
function DemandDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    invalidate();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [invalidate]);
  return null;
}

export default function SceneCanvas({ mobile }: { mobile: boolean }) {
  const reduced = scrollStore.reducedMotion;
  const [running, setRunning] = useState(true);

  // Pause when the tab is hidden or the scene is fully covered (map section).
  useEffect(() => {
    const check = () => {
      const root = document.getElementById("scene-root");
      const hiddenByMap = root ? parseFloat(getComputedStyle(root).opacity) < 0.02 : false;
      setRunning(document.visibilityState === "visible" && !hiddenByMap);
    };
    document.addEventListener("visibilitychange", check);
    const id = window.setInterval(check, 500);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(id);
    };
  }, []);

  const frameloop = reduced ? "demand" : running ? "always" : "never";
  const effects = !mobile;

  return (
    <Canvas
      frameloop={frameloop}
      dpr={mobile ? [1, 1.25] : [1, 1.6]}
      gl={{ antialias: !effects, alpha: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: mobile ? 55 : 42, near: 0.1, far: 220, position: [8, 8, 12] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.NoToneMapping;
        scene.fog = new THREE.Fog("#ffb08a", 18, 80);
      }}
      aria-hidden
    >
      <CameraRig />
      <Sky />
      <Terrain segments={mobile ? 100 : undefined} />
      <Water />
      <Forest count={mobile ? 240 : 460} />
      <Trail />
      <Tent />
      <Campfire />
      <Wireframe />
      <Particles count={mobile ? 300 : 700} />
      <LoadReporter />
      {reduced && <DemandDriver />}
      {effects && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.82} luminanceSmoothing={0.18} radius={0.75} />
          <Noise opacity={0.035} />
          <Vignette offset={0.32} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
