"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { shouldUse3D, MOBILE_BREAKPOINT } from "@/lib/useIsMobile";
import { onIntro } from "@/lib/anim";
import { loadState, subscribeLoad } from "@/lib/loadStore";
import { scrollStore } from "@/lib/gsap";
import ContourFallback from "./ContourFallback";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/** Give the hero draw this long before fetching the 3D scene. */
const SCENE_DELAY_MS = 1200;
const FADE_MS = 1400;

/**
 * Fixed full-screen layer behind all content. The 2D contour landscape paints
 * first (server-rendered, no JS needed). On capable desktops the WebGL scene is
 * fetched only once the hero is on screen, fades in over the 2D layer on its
 * first frame, and the 2D layer is then dropped. Phones / weak devices keep 2D.
 */
export default function SceneRoot() {
  const [want3D, setWant3D] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [shown, setShown] = useState(false);
  const [fallbackGone, setFallbackGone] = useState(false);

  useEffect(() => {
    if (!shouldUse3D()) return;
    setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    let timer = 0;
    let idle = 0;
    const off = onIntro(() => {
      timer = window.setTimeout(() => {
        const go = () => setWant3D(true);
        idle = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 800 }) : window.setTimeout(go, 0);
      }, SCENE_DELAY_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  // Fade the canvas in once it has rendered a frame, then unmount the 2D layer.
  useEffect(() => {
    if (!want3D) return;
    const check = () => loadState.sceneFrame && setShown(true);
    check();
    return subscribeLoad(check);
  }, [want3D]);

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setFallbackGone(true), scrollStore.reducedMotion ? 0 : FADE_MS + 100);
    return () => window.clearTimeout(t);
  }, [shown]);

  return (
    <>
      <div id="scene-root" className="fixed inset-0 z-0" aria-hidden>
        {!fallbackGone && <ContourFallback />}
        {want3D && (
          <div
            className="absolute inset-0"
            style={{
              opacity: shown ? 1 : 0,
              transition: scrollStore.reducedMotion ? undefined : `opacity ${FADE_MS}ms ease`,
            }}
          >
            <SceneCanvas mobile={mobile} />
          </div>
        )}
      </div>
      <div className="vignette" aria-hidden />
    </>
  );
}
