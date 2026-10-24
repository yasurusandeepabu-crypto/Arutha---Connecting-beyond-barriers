# Arutha Research Hub

A responsive, single-page marketing site built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, and Inter.

## Run locally

```bash
npm install
npm run dev
```

## Structure

- `app/page.tsx` assembles the one-page experience.
- `components/sections.tsx` contains the navigation, hero/PiP demo, capabilities, pipeline, trust, CTA, and footer sections.
- `app/globals.css` holds the design tokens, responsive layouts, and interaction styling.
- `public/images/avatar_image.png` is used in the hero PiP and trust card.

To replace the avatar, overwrite `public/images/avatar_image.png` with the replacement image (or update the `avatar` path in `components/sections.tsx`).

## Design review

The desktop page follows the supplied reference's section order, dark/steel-blue palette, two-column hero, four capability cards, three-step pipeline, trust feature, desktop PiP strip, centered early-access card, and multi-column footer. At 1440px, the content is constrained to a 1200px centered container to preserve the reference proportions. Small differences remain in exact source-image color sampling and typography/icon glyph matching; the reference is a single raster image, so individual original font metrics and vector icons were not available.
