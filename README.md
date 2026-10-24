# Arutha Research Hub

A responsive, single-page marketing site built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, and Inter.

## Run locally

```bash
npm install
npm run dev
```

## Structure

- `app/page.tsx` assembles the one-page experience.
- `components/sections.tsx` contains the navigation, hero companion demo, capabilities, pipeline, trust, CTA, and footer sections.
- `app/globals.css` holds the design tokens, responsive layouts, and interaction styling. The SignBridge header and hero have their own styles; the remaining sections retain their existing styles.
- `public/images/avatar.jpg` is the full-bleed hero avatar, cropped from the supplied design reference. `public/images/avatar_image.png` remains the avatar used in the trust card.

To replace the hero avatar, overwrite `public/images/avatar.jpg` with a higher-resolution, full-body signing image (or update `heroAvatar` in `components/sections.tsx`). The current crop is 450 × 554 pixels, so a larger source will look sharper on wide screens. To replace the trust-card avatar, overwrite `public/images/avatar_image.png` (or update `avatar` in `components/sections.tsx`).

## Design review

The hero uses the supplied full-bleed SignBridge reference: dark left glow and browser mockup, overlaid headline and actions, and a right-side avatar panel with a collapsible state. The separate navbar pill tracks the active section. I could not verify a browser render at 1440 × 900 or 1280 × 720 in this environment; the avatar itself is cropped from the 932 × 614 reference and may appear softer than a higher-resolution original.\n