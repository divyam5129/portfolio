"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  VignetteEffect,
} from "postprocessing";

const size = new THREE.Vector2();

/**
 * Bloom + film noise + vignette, built on `postprocessing` directly.
 * (The @react-three/postprocessing wrapper bundles N8AO and its neural denoiser
 * model, ~70 kB gzipped we never use.) Priority 1 takes over rendering from r3f.
 */
export default function Effects() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      intensity: 0.85,
      luminanceThreshold: 0.82,
      luminanceSmoothing: 0.18,
      radius: 0.75,
    });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE });
    noise.blendMode.opacity.value = 0.035;
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.55 });
    c.addPass(new EffectPass(camera, bloom, noise, vignette));
    return c;
  }, [gl, scene, camera]);

  useEffect(() => () => composer.dispose(), [composer]);

  const applied = useRef({ w: -1, h: -1, dpr: -1 });
  useFrame((_, delta) => {
    gl.getSize(size);
    const dpr = gl.getPixelRatio();
    const a = applied.current;
    if (size.width !== a.w || size.height !== a.h || dpr !== a.dpr) {
      composer.setSize(size.width, size.height);
      applied.current = { w: size.width, h: size.height, dpr };
    }
    composer.render(delta);
  }, 1);

  return null;
}
