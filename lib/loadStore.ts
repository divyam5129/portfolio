"use client";

/**
 * Tiny load store: the 3D scene reports its first rendered frame here so
 * SceneRoot can fade it in over the 2D layer.
 */
type Listener = () => void;

export const loadState = {
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
