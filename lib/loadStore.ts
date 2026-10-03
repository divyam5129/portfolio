"use client";

/**
 * Tiny load-progress store. The 3D scene reports its first rendered frame
 * here; fonts report when ready. The loader reads it.
 */
type Listener = () => void;

export const loadState = {
  fonts: false,
  sceneFrame: false,
  /** asset progress (0–100); the scene is procedural, so this stays 100 */
  assets: 100,
  /** true when the device gets the 2D fallback (no 3D to wait for) */
  no3D: false,
};

const listeners = new Set<Listener>();

export function setLoad(patch: Partial<typeof loadState>) {
  Object.assign(loadState, patch);
  listeners.forEach((l) => l());
}

export function subscribeLoad(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** 0–100 target the counter animates toward. */
export function loadTarget() {
  let p = 10;
  if (loadState.fonts) p += 30;
  p += (loadState.assets / 100) * 20;
  if (loadState.sceneFrame || loadState.no3D) p += 40;
  return Math.min(100, p);
}
