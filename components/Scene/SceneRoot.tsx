"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { shouldUse3D, MOBILE_BREAKPOINT } from "@/lib/useIsMobile";
import { setLoad } from "@/lib/loadStore";
import ContourFallback from "./ContourFallback";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/**
 * Fixed full-screen layer behind all content. Chooses the WebGL scene or the
 * animated-SVG contour fallback (weak devices / no WebGL). The fallback is also
 * what renders on the server and before JS, so the page is never blank.
 */
export default function SceneRoot() {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    const use3D = shouldUse3D();
    setMode(use3D ? "3d" : "2d");
    if (!use3D) setLoad({ no3D: true });
    // If the 3D chunk never arrives, let the loader go anyway (it caps at 3s too).
    const t = window.setTimeout(() => setLoad({ no3D: true }), 2600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <div id="scene-root" className="fixed inset-0 z-0" aria-hidden>
        {mode === "3d" ? <SceneCanvas mobile={mobile} /> : <ContourFallback />}
      </div>
      <div className="vignette" aria-hidden />
    </>
  );
}
