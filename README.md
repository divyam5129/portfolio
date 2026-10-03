# The Trail: Divyam Gupta's portfolio

A scroll-driven, cinematic portfolio built with Next.js 15, GSAP + ScrollTrigger, Lenis and react-three-fiber. One continuous contour-line landscape; scrolling walks a camera along a trail.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (types + lint)
npm start
```

## Before you publish: replace the placeholders

Everything personal lives in `/data`. Nothing in `/components` needs editing for content. Any value containing `TODO` renders as an em dash (—) on the site, never as raw text.

| What | Where |
|---|---|
| Email, LinkedIn, GitHub | `data/site.ts` (`email`, `linkedin`, `github`). Email stays hidden while it ends in `@example.com`. |
| Resume | Replace `public/resume.pdf` (currently a one-page placeholder). |
| Portrait | Put a photo in `public/photos/` and set `about.portrait` in `data/site.ts`, e.g. `"/photos/portrait.jpg"`. |
| Experience dates | `data/experience.ts`: each `period: "TODO"` (RA, Library, EY) and the SJSU years. |
| Camping trips | `data/camping.ts`: all 8 trips are **placeholders**. Replace names, coordinates, dates (`YYYY-MM`), nights, blurbs and `biome`. |
| Trail miles | `campingConfig.miles` in `data/camping.ts` (shows `—` until set). |
| Site URL (for social previews) | Set `NEXT_PUBLIC_SITE_URL` in Vercel → Project → Settings → Environment Variables. |

## Adding photos

1. Drop images into `public/photos/` (JPG/PNG/WebP; Next serves AVIF/WebP automatically).
2. List them on the trip in `data/camping.ts`:
   ```ts
   photos: ["/photos/yosemite-1.jpg", "/photos/yosemite-2.jpg"],
   ```
   They appear in the trip card carousel on the map and in the Gallery. Trips without photos show a colourful generated landscape in that trip's biome colours.

## Editing other content

- **Tagline, About statement (and its coloured phrases), spec table, skills, contact intro, section names**: `data/site.ts`
- **"Now" cards, Field Guide (ITGC domains + testing steps), marquee words**: `data/site.ts` (`now`, `toolkit`, `marquee`)
- **Time-of-day colours** (one palette per section, dawn → night): `lib/timeOfDay.ts`. If you add or remove a section, keep this list, the `sections` list in `data/site.ts`, and `cameraPoses()` in `components/Scene/world.ts` the same length.
- **Trip colours**: each trip's `biome` in `data/camping.ts` picks its pin colour and placeholder art.
- **Experience ("The climb")**: `data/experience.ts`. Each entry in `chapters` is one waypoint on the elevation profile, in order; `summit` is the final "where next" waypoint. Add a chapter and the profile, waypoints and scroll length all adjust.
- **Map region**: `campingConfig.region` = `"ca"` (fit to California, with graticule and lat/long ticks) or `"us"` (whole country).

## Deploying to Vercel

Push to GitHub, then *Add New → Project* in Vercel and import the repo. No configuration needed. Fonts are self-hosted from npm, so builds never depend on Google Fonts.

## Testing helpers

- `?scene=3d` forces the WebGL scene; `?scene=2d` forces the 2D landscape fallback. (Without a flag, devices with fewer than 4 CPU cores or weak mobile GPUs get the fallback.)
- The loader shows once per browser session. Open a new tab/private window to see it again.
- Turn on *Reduce motion* in your OS to see the calm version (no smooth scroll, no pinning, everything drawn).

## Structure

```
app/            layout (fonts, metadata, global systems), page, icon
components/     Loader, Hud, Cursor, SmoothScroll, ui helpers
components/Scene/   world (terrain maths, trail, camera poses), Terrain (contour shader),
                    CameraRig, Tent + Trail, Wireframe, Particles, SceneCanvas, ContourFallback
components/sections/ Hero, About, Experience, TrailMap, Gallery, Skills, Contact
data/           site.ts, experience.ts, camping.ts   ← all content
lib/            gsap (plugins + scroll store + scramble), lenis, anim recipes, hooks
public/         photos/, audio/ambient.mp3, og.jpg, resume.pdf
```

See `DECISIONS.md` for choices made where the spec was open.
