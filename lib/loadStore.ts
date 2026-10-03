"use client";

/**
 * Tiny load-progress store. Fonts report when ready (the loader waits on
 * them); the 3D scene reports its first rendered frame so SceneRoot can fade
 * it in. The loader does not wait for 3D: it streams in after the hero.
 */
type Listener = () => void;

export const loadState = {
  fonts: false,
  sceneFrame: false,
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
  return loadState.fonts ? 100 : 40;
}
