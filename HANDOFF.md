# Divyam Gupta Portfolio: Handoff

Context for picking up this project in a new session. Attach this file **and** `divyam-portfolio.zip` (the full source). Unzip, then `npm install && npm run dev`.

---

## 1. What this is

A scroll-driven, cinematic personal portfolio for **Divyam Gupta** (economics senior at San José State, tech risk intern at EY, camper). It's for anyone: friends, collaborators, recruiters. The look is inspired by igloo.inc: one continuous 3D scene behind the page, with the camera moving as you scroll.

**Core idea:** one continuous low-poly mountain landscape behind the page. **As you scroll, the time of day moves from dawn to night**, and both the 3D sky and the page's accent colours follow it. The site opens on a self-drawing **Golden Gate Bridge** line drawing and ends under a night sky with stars and aurora.

**Alternative version:** the earlier, more camping-themed site (tent, campfire, trail with glowing posts, hiker on an elevation profile) is preserved on the `camping-version` branch.

**Copy tone (owner's call):** professional and plain. Camping belongs only in the Trail Map, the Outdoors gallery and the Interests tags; don't use trail/summit/terrain metaphors in the professional sections.

**Stack:** Next.js 15 (App Router) + TypeScript 5.9 · Tailwind CSS v4 · GSAP 3.15 + ScrollTrigger, DrawSVG (free) · Lenis smooth scroll · three.js + @react-three/fiber 9 + postprocessing (bloom/noise/vignette, wired up directly in `Scene/Effects.tsx`; don't add drei or @react-three/postprocessing back, they add ~70 kB gzipped) · d3-geo, d3-shape (the map; data is pre-baked from Natural Earth + Terrain Tiles). Fonts are self-hosted from npm (Inter Tight + JetBrains Mono) via `next/font/local`. It deploys to Vercel with no configuration.

**Status:** `npm run build` passes with no TypeScript or ESLint errors. It's been tested at 1440px, 1280px and 375px, and with reduced motion. All interactions work by keyboard.

---

## 2. Page order (top to bottom)

Each section has a palette (time of day) and a camera pose. **These three lists must stay the same length and order:** `site.sections` in `data/site.ts`, `palettes` in `lib/timeOfDay.ts`, and `cameraPoses()` in `components/Scene/world.ts`.

| # | id | Label | Time of day | What's on screen |
|---|---|---|---|---|
| 1 | `hero` | The Bay | Dawn 06:12 | Golden Gate line drawing draws itself; name and buttons fade up; "Open to June 2027 roles" pill; View work / Resume buttons |
| 2 | `about` | About | Sunrise | Statement with three phrases in colour; portrait (generated landscape + "DG" until a photo is added); spec row; 3 stat cards (roles, class of, available from) |
| 3 | `now` | Now | Morning | 4 glass cards: Studying / Working (EY) / Looking for (2027 roles) / Community (IIA) |
| 4 | `experience` | Experience | Midday | **"Experience."** Pinned. One chapter per role plus a straight progress timeline (see §5) |
| 5 | `toolkit` | IT Controls | Afternoon | "What I work on." 4 ITGC domain cards (Access, Change, Operations, Development) that expand to "Typical evidence"; a 5-step "How a control gets tested" line that fills with scroll |
| 6 | `trail-map` | Trail Map | Golden hour | Pinned (240% scroll) topo plate of the Sierra Nevada, Tahoe to Yosemite: 200 m contours, lakes, rivers, highways, Yosemite NP boundary, peaks, towns. Route draws between the 3 real trips; trip cards show area, elevation, coordinates, date, nights |
| 7 | `gallery` | Gallery | Sunset | "Outdoors": horizontal-scroll photo strip of the camping trips, with a lightbox |
| 8 | `skills` | Skills | Dusk | "Skills": coloured tags in two groups (Work, Interests) |
| 9 | `contact` | Contact | Night (stars + aurora) | "Let's talk."; glass link cards; back to top |

---

## 3. Where things live

```
app/
  layout.tsx          fonts, metadata, global systems (SceneRoot, SmoothScroll, Hud)
  page.tsx            section order
  globals.css         design tokens, .glass, .tint, .tag-c, .legible, etc.
components/
  GoldenGate.tsx      the hero bridge drawing (pure SVG, classes used by the draw timeline)
  Landscape.tsx       procedural colourful landscape art (photo placeholders)
  Hud.tsx             corner labels, time-of-day clock, progress counter, sound toggle
  SmoothScroll.tsx    Lenis + section tracking + eased progress + writes time-of-day CSS vars
  ui.tsx              SectionLabel, Heading, Arrow, PhotoPlaceholder, Brackets, Crosshairs
  sections/           Hero, About, Now, Experience, Toolkit, TrailMap, Gallery, Skills, Contact
  Scene/
    world.ts          terrain height function, lake, hilltop (knoll), Experience camera path, tree placement, CAMERA POSES
    atmosphere.ts     per-frame lighting state from the palette (linear colours) + shared GLSL noise
    CameraRig.tsx     camera path through the poses, trail ride during Experience, fog, the 2 lights
    SceneCanvas.tsx   <Canvas> composition
    Effects.tsx       bloom/noise/vignette composer (desktop only)
    SceneRoot.tsx     2D layer first; on desktop, fetches 3D after the hero and cross-fades to it
    Sky.tsx           sky dome: gradient, sun, clouds, moon, stars, aurora
    Terrain.tsx       shaded terrain (height/slope colours + contour lines + firelight)
    Water.tsx         alpine lake;  Forest.tsx  instanced pines
    Particles.tsx     pollen/fireflies
    ContourFallback.tsx  2D layered-mountain fallback (follows the same CSS colour vars)
data/
  site.ts             ALL copy: name, links, about, now, toolkit, skills, contact, sections, hues
  experience.ts       chapters (education + roles) and the summit
  camping.ts          trips (area/lat/lng/elevation/date/nights/biome/photos), biome colour palettes
  mapFeatures.ts      peaks, towns and area labels drawn on the Trail Map
  sierra-map.json     baked map layers (contours, lakes, rivers, roads, park, state line); rebuild with `npm run build:map` (scripts/build-sierra-map.mjs)
lib/
  timeOfDay.ts        the 9 palettes (dawn → night) + interpolation
  gsap.ts             plugin registration, scrollStore (shared per-frame state)
  anim.ts             reveal (the one entrance animation), hairlines, intro handshake (startIntro/onIntro)
  sections.ts         measured section positions → sectionPhase(progress)
  lenis.ts, loadStore.ts, useIsMobile.ts (incl. shouldUse3D), usePrefersReducedMotion.ts
public/               resume.pdf (placeholder), og.jpg, audio/ambient.mp3, photos/ (empty)
```

**Rule:** personal content lives in `/data` only. Components shouldn't hard-code copy. Any value containing `TODO` renders as an em dash (—), never as raw text.

---

## 4. Key systems (read before changing things)

- **Time of day:** `SmoothScroll.tsx` reads eased scroll progress and calls `paletteAt(section + local)`. The result goes to `scrollStore.palette` (the 3D scene reads it every frame) and to the CSS variables `--accent`, `--accent-2`, `--sky-top`, `--sky-mid` and `--horizon` (the UI reads those). To recolour a section, edit its entry in `lib/timeOfDay.ts`.
- **Per-frame values never go in React state.** Use `scrollStore` in `lib/gsap.ts`: `progress`, `eased`, `section`, `experience` (0–1), `pointer`, `palette`, `velocity` and `reducedMotion`.
- **Animation:** use GSAP only. Don't add Framer Motion. Section setup uses `useGSAP` with `{ scope }`.
- **Pinned sections:** Experience, Trail Map and Gallery are pinned, with `refreshPriority` 3/2/1. Experience and Trail Map create their pins after mount, so they call `ScrollTrigger.sort()` and then `refresh()`. Keep that pattern if you add another pin.
- **3D budget:** at most about 60k triangles, at most 1 directional + 1 ambient light (firelight is faked in shaders and sprites), dpr `[1,1.6]` on desktop and `[1,1.25]` on mobile. Bloom is desktop only. Phones (<768px), devices with fewer than 4 cores and no-WebGL browsers get the 2D fallback. You can force either with `?scene=3d` or `?scene=2d`.
- **Load order:** there is no loader screen. The 2D landscape paints first; the hero intro starts once fonts are in (max 600ms). On 3D devices the WebGL chunk is fetched 1.2s after that (on idle), and `SceneRoot` fades the canvas in on its first frame, then unmounts the 2D layer.
- **Motion is deliberately restrained** (owner's call: keep it professional). Entrances use `reveal()` from `lib/anim.ts` only: a short fade-up, once. No custom cursor, tilt, scramble, per-letter splits, cursor-reactive effects, count-ups or marquees. The Golden Gate draw is the one showpiece; keep it.
- **Shaders compute in linear colour space** and end with `#include <colorspace_fragment>`, so they look the same with and without the bloom pass. Set colours with `color.setRGB(r,g,b, THREE.SRGBColorSpace)`.
- **Reduced motion:** Lenis is off, nothing is pinned, everything is drawn or shown immediately, and the 3D scene renders on demand. `scrollStore.reducedMotion` is read when the module loads, on purpose: sections set up before any provider effect runs.
- **Hero bridge:** `GoldenGate.tsx` is plain SVG. The draw order is set in `Hero.tsx` (the `draw` timeline, which plays on `onIntro`). The hero camera looks up into the dawn sky.

---

## 5. Experience section

The file is `components/sections/Experience.tsx`, and its data is `data/experience.ts`.

- **Desktop (≥900px, motion on):** the section pins for `(N-1)×85%` of scroll. Only one chapter shows at a time: a big gradient number, the org, the title, the period, and a glass card with the summary, bullets and skill tags.
- **Timeline (bottom of the section):** a straight line with evenly spaced step markers; a gradient fill grows with scroll (`scaleX`).
- **Chapter changes:** the chapter switches at the halfway point between markers, with a direction-aware transition.
- **Waypoints:** each waypoint is a button that jumps to its chapter.
- **Last waypoint:** "What's next", showing two paths (Tech controls / risk advisory and Finance & economics analytics) and "Graduating May 2027. Available from June 2027."
- **Phones and reduced motion:** the chapters stack vertically with reveal animations. `data-mode` on the section is `stacked` or `pinned`.
- **3D link:** `scrollStore.experience` drives the camera along an invisible path over the terrain (`trailCurve()` in `world.ts`).

Current chapters:
1. Economics, SJSU (2023–2027, TODO: confirm start year)
2. Resident Advisor, University Housing Services
3. Library Shifts, SJSU Library
4. Tech Risk Intern, EY

---

## 6. Facts about Divyam (use only these; never invent)

- **Name and location:** Divyam Gupta, San José, CA.
- **Education:** B.S. Economics with a minor in Business at San José State University, graduating May 2027. He's looking for full-time new-grad roles in IT audit, tech risk, internal audit or risk management, available June 2027.
- **EY:** tech risk intern doing IT general controls (ITGC) audits and **SOX controls testing**, including client site visits. **Don't claim financial-statement audit work. Don't name any EY clients.**
- **Campus roles:** Resident Advisor (University Housing Services, SJSU) and library shifts (SJSU Library).
- **Community:** student member of the Institute of Internal Auditors (IIA).
- **Outdoors:** camps and backpacks, mostly in California, and enjoys trip planning, navigation and photography.
- **Removed at his request:** IBHI California. Don't add it back.

Rules: no invented metrics, awards, dates, employers or quotes. Unknowns stay as `TODO` in the data files.

---

## 7. Still placeholder (TODO list)

| Item | Where |
|---|---|
| Email (hidden while it ends in `@example.com`), LinkedIn and GitHub URLs | `data/site.ts` |
| Real resume | replace `public/resume.pdf` |
| Portrait photo | `public/photos/` + `about.portrait` in `data/site.ts` |
| Dates for RA, Library and EY; confirm the SJSU start year | `data/experience.ts` (`period`) |
| Trips are real (Yosemite Valley, Tuolumne Meadows, Lake Tahoe) but need `date`, `nights`, campground names; the Tahoe pin sits on the lake until the campground is known | `data/camping.ts` |
| Trip photos (otherwise generated landscape art shows) | `photos: [...]` per trip |
| Total trail miles (shows "—") | `campingConfig.miles` |
| Site URL for social previews | Vercel env var `NEXT_PUBLIC_SITE_URL` |

---

## 8. Design rules to keep

- Palette tokens are in `app/globals.css`. Hue families (`dawn`, `sky`, `trail`, `pine`, `dusk`, `gold`) are in `data/site.ts` → `hues`.
- Use glass cards (`.glass`, plus `.tint` with `--a`/`--b` inline for a coloured edge and glow). Coloured tags use `.tag-c` with `--a`.
- Mono labels use the `// 0X Name` format (`SectionLabel`). Headings use `Heading` (words rise in, and a trailing "." takes the accent colour).
- Copy over bright sky gets the `.legible` class (a soft text shadow). The Experience section also has a scrim.
- No template look: no stock icons, no emoji in the UI, no gradient fill on body text.
- Mobile: 16px gutter, no horizontal scroll (`main` has `overflow-x: clip`).

---

## 9. How to verify a change

```bash
npm run build          # must pass: types + lint
npm run lint
npm start              # then check at 1440, 768 and 375 widths
```
- Check `?scene=3d` (WebGL) and `?scene=2d` (fallback).
- Turn on the OS "Reduce motion" setting and confirm everything is still readable.
- Keyboard: Tab through the waypoint buttons, map pins, trip cards (Esc closes), lightbox (arrow keys, Esc) and the domain cards.

---

## 10. Ideas not yet done (only if asked)

- A real Golden Gate photo option (would need the image file supplied).
- Real camping photos and an OG image refresh.
- A Lighthouse pass on a Vercel preview (target: Performance ≥85 on mobile, Accessibility ≥95).
