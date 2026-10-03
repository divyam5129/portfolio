# Decisions

> **Note:** this is a running history. The 3D landscape, loader, Trail Map and camping elements described below were later removed (they remain on the `camping-version` branch). The current site is described in `HANDOFF.md`.

Choices made where the spec was unspecified or where following it literally conflicted with another requirement. Default rule applied: fastest, most legible, most cinematic.

## Stack

- **Fonts are self-hosted** via `next/font/local` from `@fontsource-variable/inter-tight` and `@fontsource/jetbrains-mono` instead of `next/font/google`. Same fonts and same zero-layout-shift behaviour, but builds no longer fail when Google Fonts is unreachable.
- **`@gsap/react`** (`useGSAP`) is used for scoped, auto-reverting GSAP setup in React. It's part of GSAP, so the "GSAP only" rule holds.
- **`d3-shape`** (for `curveCatmullRom` on the map route) and **`d3-contour`** (for the 2D fallback) were added alongside `d3-geo`.
- **TypeScript pinned to 5.9**. TypeScript 6 is too new for Next 15's type checks.

## Loader

- The scene loads no external assets (everything is procedural), so there is no asset progress to report (drei `useProgress` was removed to save bundle size). The counter therefore tracks real milestones: fonts ready and the **first rendered WebGL frame** (or the fallback being chosen). Min 1.2s, max 3s as specified.
- The loader is server-rendered so it covers first paint. An inline `<head>` script hides it before paint on repeat visits (sessionStorage) and under reduced motion; `<noscript>` hides it entirely.

## 3D scene

- **Terrain is 160×160 segments, not ~200×200.** 200² is 80k triangles, over the 60k budget; 160² is 51,200.
- **Heights are precomputed on the CPU** (seeded simplex fBm) rather than in the vertex shader, so the tent, trail, posts and wireframes can all sit exactly on the ground. The tent sits on a raised knoll so it's never hidden behind a foreground hill.
- **Contour lines** use `fract(height × 18)` on normalised height with `fwidth`-based anti-aliasing (≈1px lines), plus a heavier line every 5th contour and faint 10-unit grid ticks.
- **Fog colour is `#14181a`, not `--fog` (#9aa3a8).** A light grey fog on a near-black background made distant terrain glow grey and fought the off-white text. The dark fog keeps "fading to the background" literal. Fog distance changes per section and is thickest in the Gallery.
- **Frame loop**: `always` while visible; `never` when the tab is hidden or the scene is fully faded out behind the map; `demand` (redraw on scroll only) under reduced motion. Running `demand` everywhere would have stopped the particles and idle orbit.
- **Numeric labels** on the wireframes are canvas-texture sprites instead of drei `<Html>`: no per-frame DOM updates.
- **Trail markers** in the scene are thin posts along the trail that turn orange as their flowchart node lights up. The trail line itself is revealed progressively through Experience and is fully drawn from the map onward, leading to the lit tent in the Contact shot.
- **2D fallback** is the same terrain rendered top-down as SVG contours (via `d3-contour`) with a slow CSS drift. It's also what renders on the server and before JS, so the background is never blank. `?scene=3d` / `?scene=2d` override detection for testing.

## Scroll & sections

- **Section tracking** (HUD label, camera) is derived each tick from measured section positions, including pin spacing, rather than per-section ScrollTriggers. Pinned sections otherwise made the label lag.
- **Pin ordering**: Experience, Trail Map and Gallery use explicit `refreshPriority`, and the map re-sorts ScrollTrigger after it mounts (its pin is created after the US atlas loads asynchronously).
- **Reduced motion** is read once when the scroll store is created, because section setup runs in layout effects before any provider effect.

## Experience flowchart

- **Scroll-drawing uses masks.** The trail path is dashed, and DrawSVG works by setting `stroke-dasharray`, which would erase the dash pattern. So DrawSVG draws a solid path inside an SVG `<mask>` that reveals the dashed trail. A faint dotted guide shows the route not yet walked.
- Layout is data-driven: start/steps/decision snake across 3 columns (left→right, down, right→left); branches fork on the next row; END closes below. Adding a step in `data/experience.ts` extends the snake automatically.
- **Expanded cards** are overlays, not in-flow, so opening one never changes the pinned layout. On desktop, side-column cards open toward the centre of the board, with a height cap, so they always fit the viewport.
- On mobile the section is not pinned (a pinned 300vh diagram doesn't fit a phone); each node gets most of a viewport in a vertical flow and the same draw animation scrubs with scroll.

## Trail map

- For `region: "ca"` the projection is `geoAlbers` with California-tuned parallels (34°, 40.5°) instead of `geoAlbersUsa`: AlbersUsa can't project a graticule, and the conic gives the nicer blueprint look. `region: "us"` uses `geoAlbersUsa` as specified (no graticule).
- Pins are HTML buttons positioned over the SVG (keyboard-operable, focusable, labelled). The draw is scrubbed through a proxy value so **Replay** can drive the same render function for 6s; any scroll hands control back to the scrollbar.
- Scrubber dots scroll to the moment each pin drops and open that trip's card.
- The terrain cross-fades fully out (opacity 0) behind the map, which also pauses WebGL rendering during the map.

## Content

- Placeholder email `you@example.com` is never shown; the Email slot renders `—` until a real address is set. Same for LinkedIn and GitHub URLs containing `TODO`.
- `public/resume.pdf` is a one-page placeholder, so the Resume link doesn't 404 before the real file is added.
- `public/audio/ambient.mp3` is a generated soft wind loop (filtered brown noise, 40s, ~240 KB). Swap in any track ≤ 300 KB; the toggle hides itself if the file is missing.
- Section headings not given in the spec: Experience → "Trail markers", Gallery → "Field notes", Skills → "Kit list".

## Round 2: colour, content and motion (after first review)

Divyam asked for a more colourful, Igloo-like look with more content and animation. These override parts of the original spec:

- **Colour replaces the monochrome rule.** The orange-only accent and the "lines only" look are gone. The walk now runs from **dawn to night** as you scroll: one palette per section in `lib/timeOfDay.ts` drives the 3D sky, sun, lighting and fog, *and* the page's `--accent`, `--accent-2`, `--sky-*` CSS variables, so UI colour always matches the scene. The HUD shows the current time of day.
- **3D scene is now lit and shaded**: gradient sky dome with sun, clouds, moon, stars and aurora; terrain coloured by height and slope (sand, meadow, golden grass, forest, rock, snow) with the contour lines kept as a tinted overlay; an alpine lake with sky reflections and sun glitter; ~460 instanced low-poly pines; an orange tent that glows from inside at night; a campfire with animated flames and embers; iridescent floating crystals replacing the wireframe cubes; bloom, film grain and vignette on desktop.
- **Light budget**: still one directional + one ambient light. Firelight is faked in the terrain shader and with additive glow sprites, not extra lights.
- **Triangle budget**: terrain reduced to 136×136 (37k triangles) to make room for trees; total stays under ~60k. Phones get fewer trees and a 100×100 terrain, and no post-processing.
- **Colour space**: custom shaders compute in linear space and end with `<colorspace_fragment>`, so they look identical with and without the bloom pass.
- **Gradients on text**: still avoided on body copy and headings. Colour comes from highlighted phrases, accent punctuation, and gradient *buttons/marquees*.
- **New content** (all in `data/site.ts`, all factual): a "Now" section, a "Field Guide" explaining IT general controls in plain English with a scroll-driven "how a control gets tested" stepper, a by-the-numbers band (computed from the data), and two velocity-reactive marquees.
- **Client names** (e.g. EY audit clients) are deliberately not shown anywhere.
- **Placeholder art**: photos and the portrait now fall back to colourful generated landscapes (per-trip biome palettes in `data/camping.ts`) instead of grey boxes.
- **2D fallback** is now a layered mountain landscape whose sky and ridges follow the same time-of-day CSS variables.
- **New motion**: hero letters rise with a warm "sunrise" flash and light up under the cursor; 3D tilt + sheen on cards; cursor glow; cards flip up into place; animated domain icons; process line fills with scroll; marquee speeds up, reverses and skews with scroll velocity; stats count up; contact letters colour toward the cursor.

## Round 3: hero and experience (after second review)

- **Hero is now the Golden Gate Bridge**, drawn as line art (`components/GoldenGate.tsx`) the same way the camping route draws itself: water, headlands, towers, deck, main cable, then suspenders, followed by drifting fog wisps, gulls and car lights crossing the deck. The 3D camera looks up into the dawn sky behind it, so the tent no longer appears in the opening shot. A drawing was used rather than a photo (no image download, no licensing questions, and it matches the site's line language).
- **IBHI California removed** everywhere (Now cards, experience, docs). The fourth "Now" card is the IIA student membership.
- **Experience rebuilt as "The climb so far."** The flowchart is gone. Each role is a full chapter (big gradient number, title, org, summary, bullets, skill tags) and an elevation profile along the bottom shows a hiker climbing from waypoint to waypoint as you scroll; waypoints are buttons that jump to each chapter. The last waypoint is the "Next summit" with the two directions. Phones and reduced motion get the chapters stacked vertically instead of pinned.
