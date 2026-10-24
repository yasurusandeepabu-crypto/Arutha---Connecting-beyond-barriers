# Teammate handoff

## Run

Install `requirements.txt`, then `python -m backend.main`. Open `/live.html` in desktop Chrome. Prepare the model, open the avatar popup, share the YouTube tab with tab audio enabled, and play it. Preload Whisper's model before demo time. No private credentials are needed.

## Frontend

Copy `avatar/` to the frontend's static assets, preserving relative paths. Load `player.css`. Next.js can keep the files under `public/avatar/` and dynamically import them after client mount.

```js
const { mountFloatingAvatar } = await import('/avatar/player.js');
const { TabAudioCapture } = await import('/avatar/tab-audio.js');
const floating = mountFloatingAvatar();
const capture = new TabAudioCapture({
  endpoint: 'http://localhost:8000/api/audio',
  onResult(result) {
    floating.player.enqueue(result);
    // Display result.text, flags, review_status and pending in your UI.
  },
  onStatus(message) { console.log(message); },
});
```

Call `capture.start()` directly from a click handler for the browser share picker. Call `capture.stop()` to finish the last chunk and flush incomplete sentences. On component unmount, stop capture and call `floating.destroy()`. The browser requests video and audio permission, but only complete audio blobs are sent.

For the floating experience, import `createFloatingAvatar` from `/avatar/floating-window.js`. It returns `open()` (async, invoke directly from a user click), `enqueue(result)`, `stop()`, `setCaptureState(state)`, `destroy()`, `isOpen` and `mode`. Pass `onClose` and `onStopCapture` callbacks to stop your capture session. The live page shows an example. It moves one player into Chrome's Document PiP window; it does not run two avatar queues. Unsupported browsers use `floating-shell.html` as a regular popup, with no always-on-top guarantee. The launcher tab must remain open. The older `openAvatarWindow()` helper is used only by the embedded debug page.

Capture restarts MediaRecorder every four seconds so each blob is a complete WebM file. One upload runs at a time; at most two chunks wait. Old chunks are skipped rather than building an unlimited backlog. Missing sequence numbers clear partial sentences. Skipped audio cannot be recovered as captions or signing.

## Translation API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Speech readiness and meaning analyzer mode |
| `POST /api/prepare` | Load local base.en model once |
| `POST /api/audio` | Complete audio, max 4 MB; session and sequence headers |
| `POST /api/interpret` | Stateful text chunks and flush |
| `POST /api/translate` | Stateless text analysis and translation plan |
| `POST /api/gloss` | Compatibility alias for the new stateless translator |
| `GET /api/phrases` | English coverage, clip configuration and validation state |
| `GET /api/catalog` | Meaning definitions, review status and provenance |

Text example:

```json
{"text":"I am nineteen years old.","preview_unverified":false}
```

The response includes `text`, `tokens`, `frames`, `translations`, `sign_sequence`, `timeline`, `flags`, `review_status`, `preview_only`, `unsupported`, `pending` and `gloss_ms`. Audio also includes `stt_ms`. No signing construction for age nineteen exists initially, so it reports the age without selecting AGE-NINE.

Stateful text additionally needs `session_id`, increasing `sequence`, and optional `flush`/`gap`. Raw audio uses `X-Session-Id` and `X-Chunk-Sequence`. If using another origin, add it to `CORS_ORIGINS`.

**Enqueue only `tokens`.** Candidate units may be present while playback is blocked. Display review flags; do not interpret candidate clip IDs as validated SLSL text. Keep full captions visible. Confidence is uncalibrated/null, not a percentage accuracy score.

## Review preview

All initial catalog entries are PENDING. Normal playback requires actual SLSL review evidence and an existing asset. For explicit review, set `capture.previewUnverified = true` before capture, or send `preview_unverified:true` for text. Audio sends `X-Preview-Unverified:1`. The live page provides a checkbox and locks it during capture.

Preview keeps REVIEW_REQUIRED and the popup's unverified badge. It does not validate a translation. Missing assets still receive no playback tokens. See [TRANSLATION.md](TRANSLATION.md) for the implemented subset and review metadata; see [CLIPS.md](CLIPS.md) for clip filenames.

## Existing Python speech backend

```python
import asyncio
from backend.interpret import interpret

result = await asyncio.to_thread(
    interpret, transcript, session_id, sequence,
    flush=False, preview=False,
)
await websocket.send_json(result)
```

Preserve chunk order and use a new session ID for each capture. A silent chunk or final flush completes pending text. Meaning extraction and clip scheduling are separate; no universal SLSL word order or facial grammar is assumed.
