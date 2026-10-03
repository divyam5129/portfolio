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
  // Phones get the 2D landscape: far less to download and kinder to battery.
  if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches && !force3D) return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores < 4 && !force3D) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    return true;
  } catch {
    return false;
  }
}
