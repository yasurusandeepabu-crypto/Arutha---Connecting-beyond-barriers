# Fast hackathon hosting

Current temporary demo: https://upgrades-providing-certain-programmer.trycloudflare.com

The simplest demo deployment exposes the entire running Python app through an HTTPS Cloudflare Quick Tunnel. The website, API and sign assets share one origin; no Vercel configuration or CORS changes are needed. Whisper runs on the team laptop, not a Cloudflare Worker.

## Run

1. Build `frontend/` with `npm ci` then `npm run build`.
2. From the root, activate the Python environment and run `python -m backend.main`.
3. Open http://127.0.0.1:8000 and load the speech engine before presenting.
4. Install Cloudflare's official `cloudflared` client. In a second terminal:

```sh
cloudflared tunnel --url http://127.0.0.1:8000 --protocol http2 --no-autoupdate
```

5. Copy the printed `https://…trycloudflare.com` address into the submission form. Open that address in desktop Chrome and check avatar playback and microphone permission.

Keep the laptop awake, connected to power/internet, and both processes running. The URL changes when the tunnel restarts and stops when the tunnel or laptop stops. Quick Tunnels are a temporary testing/demo service without an uptime guarantee, not permanent hosting.

Official instructions: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Longer-term deployment

Use a persistent host with enough CPU/RAM for faster-whisper, install Python/Node dependencies, build the frontend, preload the Whisper model and run `python -m backend.main` behind a managed HTTPS reverse proxy. Set `HOST=0.0.0.0` and the platform's `PORT` as needed. Add authentication, resource/rate limits and operational monitoring before production use.

Splitting the frontend onto Vercel is possible later, but the backend must remain reachable over HTTPS; set `NEXT_PUBLIC_API_BASE_URL` before building and allow that frontend origin in `CORS_ORIGINS`. Do not submit a static-only website as though its local speech backend were deployed.
