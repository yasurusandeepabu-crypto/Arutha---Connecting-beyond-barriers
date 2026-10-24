# Arutha website integration

Design source: the team-provided [UI branch](https://github.com/yasurusandeepabu-crypto/Arutha---Connecting-beyond-barriers/tree/UI), commit `4fb1e1290fb7bf4b01b1965ef29d34b2bfaa20c8`.

The layout, steel-blue/navy palette, illustration, typography, cards, section order and responsive navigation come from that branch. The integrated source is in `frontend/`; the reference checkout is ignored. No changes were pushed to the team's repository.

## Run the finished website

Requires Node.js 20.9+ and a working Python environment. From the project root:

```sh
cd frontend
npm ci
npm run build
cd ..
python -m pip install -r requirements.txt
python -m backend.main
```

Open http://127.0.0.1:8000. Python serves both the exported website and the existing API. No separate frontend server or private credentials are required after the build. If `frontend/out/` is absent, the backend falls back to the standalone launcher.

## Development

Run the Python backend on port 8000. In `frontend/`, run `npm run dev`, then open http://127.0.0.1:3000. Development defaults to the backend on port 8000; `NEXT_PUBLIC_API_BASE_URL` can override it. Allow the frontend origin in backend `CORS_ORIGINS`. For a separately hosted frontend, set the public API URL at build time and use HTTPS for both sites.

`npm run build` and `npm run dev` first copy the shared capture/player and CWASA-wrapper files from `avatar/` into `public/runtime/`. Do not edit those generated copies. Clip definitions and media are loaded from the Python backend's `/signs/manifest.json`, so translation asset checks and playback use the same files. After changing the shared runtime, rebuild or rerun `npm run predev`.

Inter is bundled locally using Fontsource, with its OFL license exported under `/licenses/inter-OFL.txt`. No Google Fonts request is needed to build or run the site.

## Files to explain

| File | Responsibility |
| --- | --- |
| `frontend/components/sections.tsx` | Designer's marketing sections, navigation, illustrative preview and real local feedback download |
| `frontend/components/companion-provider.tsx` | Shared session state, local API requests, runtime initialization and cleanup |
| `frontend/components/session-panel.tsx` | Live controls, captions and review tools, shown after opening the companion |
| `frontend/app/globals.css` | Designer's original styling plus scoped session styles |
| `frontend/app/page.tsx` | Section order and session provider |
| `frontend/app/layout.tsx` | Local font, metadata and document shell |
| `frontend/next.config.mjs` | Static export, local image rendering and API-base configuration |
| `frontend/scripts/sync-runtime.mjs` | Copies shared runtime and the font license before dev/build |
| `backend/main.py` | Serves the exported homepage/assets and existing API/tools |

The designer's avatar image is labeled as a concept illustration. The actual signing companion now uses the CWASA Anna 3D avatar and 14 unverified ASL word signs; see [ASL_DEMO.md](ASL_DEMO.md). Claims about 30 FPS, general translation and calibrated facial markers were replaced with the implemented scope. The signup placeholder now downloads real local feedback JSON; it does not pretend to register an email or send a message.

## Workflow

Click any **Open Your Signing Companion** CTA. It opens the real floating companion and reveals the live session panel. Load the speech engine if needed, then share a browser tab with tab audio enabled. Keep the website open while switching to YouTube. Close the companion to stop capture.

The Material-inspired companion retains its blue styling and is branded Arutha when opened from this website. The standalone SignBridge tools remain at `/live.html`, `/capture.html`, `/record.html` and `/index.html`. The ASL preview always displays its unverified status. Unsupported words remain in captions; the illustration is never used as a signing clip.

## Verification

`npm run build` includes TypeScript checking. `scripts/frontend_smoke.cjs` checks the exported page, actual companion opening, local speech-engine loading, synthetic tab capture/cleanup, real translation checks, feedback download and mobile navigation/overflow. It saves desktop and mobile screenshots. Use `TEST_URL` for another local port.

The frontend dependencies were updated from the reference branch's older versions; the installed dependency audit reported zero vulnerabilities. This is a local hackathon prototype, not a claim of production security or validated SLSL comprehension.
