"use client";

import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setFine(mq.matches);
    const onChange = () => setFine(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return fine;
}

/** Decide whether the device should get the WebGL scene or the 2D fallback. */
export function shouldUse3D(): boolean {
  if (typeof window === "undefined") return false;
  // Manual override for testing: ?scene=3d or ?scene=2d
  const forced = new URLSearchParams(window.location.search).get("scene");
  if (forced === "2d") return false;
  const force3D = forced === "3d";
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores < 4 && !force3D) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const mobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
    if (mobile && !force3D) {
      // Rough mobile GPU test: very small texture limits = weak GPU.
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      if (maxTex < 4096) return false;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
        if (/Mali-4|Adreno \(TM\) [1-4]\d\d|PowerVR SGX/i.test(renderer)) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
