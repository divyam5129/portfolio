# Divyam Gupta's portfolio

A scroll-driven portfolio built with Next.js 15, GSAP + ScrollTrigger and Lenis. The page runs from dawn to night as you scroll, over Bay Area line drawings that draw themselves: the Golden Gate, the San José skyline, San Francisco's financial district and the Bay Bridge.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (types + lint)
npm start
```

An earlier, camping-themed version (3D mountain landscape and a trail map) lives on the `camping-version` branch.

## Before you publish: replace the placeholders

Everything personal lives in `/data`. Nothing in `/components` needs editing for content. Any value containing `TODO` renders as an em dash (—) on the site, never as raw text.

| What | Where |
|---|---|
| Email, LinkedIn, GitHub | `data/site.ts` (`email`, `linkedin`, `github`). Email stays hidden while it ends in `@example.com`. |
| Resume | Replace `public/resume.pdf` (currently a one-page placeholder). |
| Portrait | Put a photo in `public/photos/` and set `about.portrait` in `data/site.ts`, e.g. `"/photos/portrait.jpg"`. |
| Experience dates | `data/experience.ts`: each `period: "TODO"` (RA, Library, EY) and the SJSU years. |
| Photos for "Beyond work" | `data/camping.ts`: add `photos` to each trip (see below). |
| Site URL (for social previews) | Set `NEXT_PUBLIC_SITE_URL` in Vercel → Project → Settings → Environment Variables. |

## Adding photos

1. Drop images into `public/photos/` (JPG/PNG/WebP; Next serves AVIF/WebP automatically).
2. List them on the trip in `data/camping.ts`:
   ```ts
   photos: ["/photos/yosemite-1.jpg", "/photos/yosemite-2.jpg"],
   ```
   They appear in the "Beyond work" photo strip. Trips without photos show generated placeholder art.

## Editing other content

- **Tagline, About statement (and its coloured phrases), spec table, skills, contact intro, section names**: `data/site.ts`
- **"Now" cards, IT controls (ITGC domains, testing steps, and the example workpaper)**: `data/site.ts` (`now`, `toolkit`)
- **Experience**: `data/experience.ts`. Each entry in `chapters` is one ledger row, in order; `summit` is the final "What's next" row.
- **Time-of-day colours** (one palette per section, dawn → night): `lib/timeOfDay.ts`. If you add or remove a section, keep this list and the `sections` list in `data/site.ts` the same length.

## Deploying to Vercel

Push to GitHub, then *Add New → Project* in Vercel and import the repo. No configuration needed. Fonts are self-hosted from npm, so builds never depend on Google Fonts.

## Testing helpers

- Turn on *Reduce motion* in your OS to see the calm version (no smooth scroll, no pinning, everything drawn).

## Structure

```
app/            layout (fonts, metadata, global systems), page, icon
components/     Backdrop, GoldenGate, BayArt (line illustrations), Hud, SmoothScroll, ui helpers
components/sections/ Hero, About, Now, Experience, Toolkit, Gallery, Skills, Contact
data/           site.ts, experience.ts, camping.ts   ← all content
lib/            gsap (plugins + scroll store), lenis, anim recipes, time of day, hooks
public/         photos/, audio/ambient.mp3, og.jpg, resume.pdf
```

See `HANDOFF.md` for how the systems fit together, and `DECISIONS.md` for the history of design choices.
