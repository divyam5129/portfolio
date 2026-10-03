# Divyam Gupta Portfolio: Handoff

Context for picking up this project in a new session. Attach this file **and** `divyam-portfolio.zip` (the full source). Unzip, then `npm install && npm run dev`.

---

## 1. What this is

A scroll-driven personal portfolio for **Divyam Gupta** (economics senior at San José State, tech risk intern at EY). It's for anyone: friends, collaborators, recruiters.

**Core idea: the Bay Area, dawn to night.** The page sits on a dark gradient backdrop whose tint follows the **time of day, which moves from dawn to night as you scroll**; the page's accent colours follow it too. It opens on a self-drawing **Golden Gate Bridge**, and Bay Area line illustrations draw themselves as you reach them: the **San José skyline** (About), **San Francisco's financial district** (What I work on) and the **Bay Bridge at night with the Bay Lights** (Contact).

**Alternative version:** the earlier camping-themed site (3D mountain landscape, tent, campfire, trail, Trail Map) is preserved on the `camping-version` branch.

**Tone (owner's call):** professional and plain. No trail/summit/camping metaphors. Camping appears only in the "Beyond work" photo strip and the Interests tags.

**Stack:** Next.js 15 (App Router) + TypeScript 5.9 · Tailwind CSS v4 · GSAP 3.15 + ScrollTrigger, DrawSVG (free) · Lenis smooth scroll. No WebGL. Fonts are self-hosted from npm (Inter Tight + JetBrains Mono) via `next/font/local`. It deploys to Vercel with no configuration.

**Status:** `npm run build` passes with no TypeScript or ESLint errors. Tested at 1440px, 1024px and 390px, and with reduced motion. All interactions work by keyboard.

---

## 2. Page order (top to bottom)

Each section has a time-of-day palette. **These two lists must stay the same length and order:** `site.sections` in `data/site.ts` and `palettes` in `lib/timeOfDay.ts`.

| # | id | Label | Time of day | What's on screen |
|---|---|---|---|---|
| 1 | `hero` | The Bay | Dawn 06:12 | Golden Gate line drawing draws itself (fog, gulls and cars keep moving); name and buttons fade up; "Open to June 2027 roles" pill |
| 2 | `about` | About | Sunrise | Statement; portrait ("DG" monogram until a photo is added); spec row; 3 stat cards; **San José skyline** (windows light up, a light-rail train passes) |
| 3 | `now` | Now | Morning | 4 glass cards: Studying / Working (EY) / Looking for / Community (IIA) |
| 4 | `experience` | Experience | Midday | A ledger (No. · Role · Organization · Period); pinned on desktop, the row in focus opens (see §5) |
| 5 | `toolkit` | IT Controls | Afternoon | "What I work on." 4 ITGC domain cards; **SF financial district** illustration; pinned walkthrough: 5 steps beside an example workpaper that fills in (data in `site.toolkit.example`, labelled "Illustrative example · not client data") |
| 6 | `gallery` | Beyond Work | Sunset | "Beyond work": horizontal-scroll photo strip (trips from `data/camping.ts`) with a lightbox |
| 7 | `skills` | Skills | Dusk | Coloured tags in two groups (Work, Interests) |
| 8 | `contact` | Contact | Night | "Let's talk."; link cards; **Bay Bridge at night** (Bay Lights shimmer, cars cross); back to top |

---

## 3. Where things live

```
app/
  layout.tsx          fonts, metadata, global systems (Backdrop, SmoothScroll, Hud)
  page.tsx            section order
  globals.css         design tokens, .glass, .tint, .tag-c, .legible, .grain, .vignette
components/
  Backdrop.tsx        fixed dark gradient tinted by the time-of-day CSS vars + grain + vignette
  GoldenGate.tsx      the hero bridge drawing (pure SVG, classes used by the draw timeline)
  BayArt.tsx          SanJoseSkyline, FinancialDistrict, BayBridge line illustrations
  Landscape.tsx       generated landscape art (gallery photo placeholders)
  Hud.tsx             corner labels, time-of-day clock, progress counter, sound toggle
  SmoothScroll.tsx    Lenis + section tracking + eased progress + writes time-of-day CSS vars
  ui.tsx              SectionLabel, Heading, Arrow, PhotoPlaceholder, Brackets, Crosshairs
  sections/           Hero, About, Now, Experience, Toolkit, Gallery, Skills, Contact
data/
  site.ts             ALL copy: name, links, about, now, toolkit (+ workpaper example), skills, contact, sections, hues
  experience.ts       chapters (education + roles) and the "What's next" row
  camping.ts          trips for the photo strip (photos, biome colours for placeholders)
lib/
  timeOfDay.ts        the 8 palettes (dawn → night) + interpolation
  gsap.ts             plugin registration, scrollStore (shared per-frame state)
  anim.ts             reveal (the one entrance animation), drawLineArt (scroll-drawn illustrations), seeded random, hairlines, intro handshake (startIntro/onIntro)
  sections.ts         measured section positions → sectionPhase(progress)
  lenis.ts, useIsMobile.ts, usePrefersReducedMotion.ts
public/               resume.pdf (placeholder), og.jpg, audio/ambient.mp3, photos/ (empty)
```

**Rule:** personal content lives in `/data` only. Components shouldn't hard-code copy. Any value containing `TODO` renders as an em dash (—), never as raw text.

---

## 4. Key systems (read before changing things)

- **Time of day:** `SmoothScroll.tsx` reads eased scroll progress and calls `paletteAt(section + local)`. The result goes to `scrollStore.palette` (the HUD clock) and to the CSS variables `--accent`, `--accent-2`, `--sky-top`, `--sky-mid` and `--horizon` (the backdrop and UI). To recolour a section, edit its entry in `lib/timeOfDay.ts`.
- **Per-frame values never go in React state.** Use `scrollStore` in `lib/gsap.ts`: `progress`, `eased`, `section`, `palette`, `velocity` and `reducedMotion`.
- **Animation:** use GSAP only. Don't add Framer Motion. Section setup uses `useGSAP` with `{ scope }`.
- **Line art:** strokes with class `la-draw` are drawn by `drawLineArt()` as the illustration scrolls in (scrubbed; it completes when the whole illustration is on screen), then its `onDrawn` callback starts ambient life (`la-win` windows, the train, the Bay Lights). The Bay Lights loop only runs while the bridge is on screen.
- **Pinned sections:** Experience, the IT controls walkthrough and Gallery are pinned, with `refreshPriority` 3/2.5/1. Pins created after mount call `ScrollTrigger.sort()` and then `refresh()`. Keep that pattern if you add another pin.
- **Load order:** there is no loader screen and no WebGL. The hero intro starts once fonts are in (max 600ms).
- **Motion is deliberately restrained** (owner's call: keep it professional). Entrances use `reveal()` only: a short fade-up, once. No custom cursor, tilt, scramble, per-letter splits, cursor-reactive effects, count-ups or marquees. The showpieces are the line drawings.
- **Reduced motion:** Lenis is off, nothing is pinned, drawings and content show immediately. `scrollStore.reducedMotion` is read when the module loads, on purpose: sections set up before any provider effect runs.
- **Hero bridge:** `GoldenGate.tsx` is plain SVG. The draw order is set in `Hero.tsx` (the `draw` timeline, which plays on `onIntro`).

---

## 5. Experience section

The file is `components/sections/Experience.tsx`, and its data is `data/experience.ts` (`chapters` + `summit` for the "What's next" row).

- **Desktop (≥900px, motion on):** the section pins for `(N-1)×70%` of scroll. Rows are a ledger; the row in focus opens with a grid-rows transition, the others stay as one-line entries at reduced opacity. A rail on the left fills with scroll. Each row is a button that jumps to it. `data-mode` is `pinned`.
- **Phones and reduced motion:** every row is open, with the shared `reveal()` fade. `data-mode` is `stacked`.
- **Pins:** Experience (refreshPriority 3), the IT controls walkthrough (2.5), Gallery (1). Each calls `ScrollTrigger.sort()` + `refresh()` after creating its pin.

Current chapters:
1. Economics, SJSU (2023–2027, TODO: confirm start year)
2. Resident Advisor, University Housing Services
3. Library Shifts, SJSU Library
4. Tech Risk Intern, EY

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
| Trips (Yosemite Valley, Tuolumne Meadows, Lake Tahoe) for the photo strip; add `date` if you want years in captions | `data/camping.ts` |
| Trip photos (otherwise generated landscape art shows) | `photos: [...]` per trip |
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
- Turn on the OS "Reduce motion" setting and confirm everything is still readable.
- Keyboard: Tab through the ledger rows, walkthrough steps, domain cards and the lightbox (arrow keys, Esc).

---

## 10. Ideas not yet done (only if asked)

- A real Golden Gate photo option (would need the image file supplied).
- Real camping photos and an OG image refresh.
- A Lighthouse pass on a Vercel preview (target: Performance ≥85 on mobile, Accessibility ≥95).
