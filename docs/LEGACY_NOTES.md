# SignBridge

## Current demo: ASL + 3D avatar

The active website now uses **14 ASL word signs** from Kozha's SiGML dictionary on UEA's CWASA Anna avatar. This is an **unverified lexical preview**, not a full sentence translator or SLSL interpreter. English audio → local speech recognition → supported word matching → SiGML → floating 3D avatar. Unsupported words remain in captions; negated/conditional clauses are caption only. No private keys are required; **internet is required for the avatar engine**.

Read [ASL demo setup, files, example text and limitations](docs/ASL_DEMO.md). Start with: **Hello. Thank you. Yes. No. Mother. Father. Eat. Good. Name. Want. Finish. House. Learn. Help.** The dictionary has no Deaf-native review. Its separate data licence and CWASA's conditions remain intact; only our project code is MIT. See [third-party notices](THIRD_PARTY.md).

The homepage now shows the real avatar and a **Play 14-sign text demo** button. For a live spoken demo, load the speech engine, choose **Use microphone**, and read: **Hello, mother. Hello, father. Want help? Yes. Learn a name. Want a house? No. Eat. Good. Finish. Thank you.** Pause after each sentence. **Open companion** moves the same avatar into the floating window; closing it returns the avatar to the page. Text playback and real audio capture are explicitly distinguished.

The sections below also document earlier SLSL team-recording experiments. Those experiments are retained; their missing-asset and review restrictions still apply. The active HTTP translation endpoints use the ASL preview described above.

## Arutha website

The team's `UI` branch is integrated in `frontend/`, with the real tab-audio, translation and floating companion workflow. To build it, run `npm ci` and `npm run build` inside `frontend/`, then start `python -m backend.main` from this root. The website is served at http://127.0.0.1:8000. See [UI integration and setup](docs/UI_INTEGRATION.md). The standalone tools remain available.

Hack for Humanity · AI Collective Colombo · MLH-supported

English speech is difficult to access when captions are unavailable, and captions alone do not meet every Deaf user's language preferences. SignBridge explores captions alongside a floating avatar driven by team-recorded signs.

This folder contains **live tab-audio capture, local speech recognition and phrase-based SLSL clip playback**, plus the team's own camera-driven 2D avatar. The existing root `index.html` and `stt_test.py` remain audio experiments.

## Live YouTube demo

The homepage is now a clean launcher. The avatar opens in Chrome's **Document Picture-in-Picture** window and stays above other windows; it is no longer embedded on the live page. Move or resize the window using its native frame. Keep the launcher tab open. Closing the avatar stops audio capture and releases the shared tracks. Unsupported browsers get a regular popup, which is explicitly labeled as not always-on-top. Tab sharing still requires Chrome's picker and the user's audio-sharing choice. [Chrome API documentation](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).

Use **Load speech engine**, **Open floating avatar**, then **Share YouTube tab audio**. Captions remain on the launcher and also appear with the avatar. Coverage, review preview and technical details are under **Team tools & demo setup**. The old embedded text experiment remains at `/index.html` for debugging.

The translation agent now analyzes supported English meanings and checks a separate SLSL construction catalog before playback. See [docs/TRANSLATION.md](docs/TRANSLATION.md). Current entries are **PENDING**, so normal mode returns review flags rather than automatically playing unverified clips. To inspect supplied clips, enable **Preview unverified team clips (review only)** on the live page. No validation is implied.

```sh
python -m pip install -r requirements.txt
python -m backend.main
```

Open http://localhost:8000 in desktop Chrome. Select the YouTube tab and enable **Share tab audio**. Press play in YouTube.

Every four seconds, a complete audio file is sent to the local server. `base.en` is loaded once and transcribes on CPU/int8. The phrase matcher carries incomplete phrases across chunks, then queues the team's corresponding SLSL clip. No keys are required. The first model load may download weights; preload it before the demo.

**Clips have not been supplied yet.** See [docs/CLIPS.md](docs/CLIPS.md) for filenames and setup. Until then, captions and matching work but the avatar explicitly reports missing clips. The live mode selects supplied phrase interpretations; it does not independently generate or verify SLSL grammar. Unsupported speech remains in captions. The text test is explicitly separate from real audio capture.

## Run the no-key demo

Python 3.10+; no packages needed for the text planner or web player.

```sh
python -m backend.main
```

Open http://localhost:8000. Enter a transcript and press **Plan & play**. Drag the avatar by its header or open the separate avatar window. This is a browser popup; the operating system does not guarantee that it stays above other apps.

**No sign assets are bundled.** Initially the avatar rests and letters appear as labeled text. That is not fingerspelling. Our selected target is Sri Lankan Sign Language (SLSL), using team performances based on trusted references, not independently verified.

## Recommended: live camera → our avatar

```sh
python scripts/setup_tracking.py
python -m backend.main
```

Open http://localhost:8000/capture.html. The first command downloads pinned MediaPipe JS/WASM and tracking models; after setup, tracking needs no internet or API credentials. See [third-party dependencies](THIRD_PARTY.md).

1. Click **Start camera & tracking** and allow camera access. No microphone or video upload is used.
2. Keep your upper body and fingertips in view. Enter `HELLO` (or another supported label), then click **Capture movement**.
3. Perform the sign once and click **Finish capture**. Captures stop after eight seconds. Missing tracking can reject a capture.
4. **Replay last capture** and compare handshape, orientation and timing against the SLSL reference. Save only after review.
5. **Save to local library**, then open the text player on the same address. The player automatically loads saved signs. Refresh a previously open player after saving.
6. **Download motion JSON** for backup or to share with your teammate. For a shared deployment, commit reviewed motion files under `avatar/signs/` and add their paths to the manifest.

Browser storage is tied to the exact origin: `localhost` and `127.0.0.1` have separate libraries. Clearing browser storage removes local signs. Motion JSON can be imported on the capture page; choose Sign or Letter before importing. Use the Letter option for one-letter fingerspelling captures.

This captures your team's performed movement directly as points. It neither learns SLSL nor reconstructs invisible fingers. Body tracking, hand assignment, normalization and animation are separate, explainable steps. The synchronous detectors run at most 30 times per second on the main thread; actual speed depends on the laptop.

## Record and add signs

1. Open http://localhost:8000/record.html. Record your own consenting teammate, one sign per clip. No copyrighted third-party sign videos or images. Preview and saved video are unmirrored. Capture a few signs first and assess recognizability before recording the full vocabulary.
2. Copy the downloaded clip to `avatar/signs/HELLO.webm`. Add this entry to `avatar/signs/manifest.json` under `signs`:

```json
"HELLO": {"video": "HELLO.webm"}
```

3. For landmark animation, install the optional conversion dependencies in a working Python environment:

```sh
python -m pip install -r requirements-recorder.txt
```

4. Download Google's [Pose Landmarker Lite](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task) and [Hand Landmarker](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task) models into `models/`, with filenames `pose_landmarker_lite.task` and `hand_landmarker.task`. These are tracking models, not sign-language models. The app loads no remote models at playback time. Keep third-party model licensing separate from the MIT project code. See Google's [pose guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python) and [hand guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/python).

```sh
python scripts/extract_motion.py avatar/signs/HELLO.webm --gloss HELLO --output avatar/signs/HELLO.json
```

5. Update the manifest entry to `{"motion":"HELLO.json","video":"HELLO.webm"}`. Paths are relative to the manifest. Set `language` to the language actually recorded. Refresh the player after editing assets.
6. For fingerspelling, record each letter and add entries under `letters`, e.g. `"A":{"motion":"A.json","video":"A.webm"}`. A name can be fingerspelled only when its letters have recorded assets.

Review every exported motion against its video. Low tracking-error counts do not establish that a sign is recognizable. At about 90 minutes, make the go/no-go decision: if the avatar is unclear, remove `motion` entries and use the original videos. Videos also play automatically when a motion file fails validation or loading; the app cannot detect linguistic quality automatically.

## Connect the team's UI

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the contract. Call `backend.interpret.translate(text)` from an existing Python server, or `interpret(...)` to keep streaming context. Keep blocking work off an async event loop with an executor or `asyncio.to_thread`.

## Architecture and files

| File | Purpose |
| --- | --- |
| `backend/vocab.py` | Allowed 16-sign vocabulary and 25-token limit |
| `backend/gloss.py` | Legacy word-planning experiment; not used by translation endpoints |
| `backend/main.py` | Local HTTP demo, `/api/gloss`, `/api/signs`, static player |
| `backend/stt.py` | One local Whisper model, one inference at a time, in-memory audio |
| `backend/interpret.py`, `backend/phrases.json` | Stateful phrase matching and explicit demo coverage |
| `backend/semantics.py` | Conservative English meaning analysis, independent of transfer data |
| `backend/catalog.json`, `backend/translation.py` | Construction metadata, review evidence, matching and back-check |
| `backend/semantic_llm.py` | Optional checked meaning proposals, always requiring review |
| `avatar/live.html`, `avatar/live.js` | Live tab-capture controls, captions, coverage and floating playback |
| `avatar/live.css` | Launcher layout and responsive styles |
| `avatar/floating-window.js`, `avatar/floating-shell.html` | Always-on-top avatar controller and normal-popup fallback shell |
| `avatar/tab-audio.js` | Complete four-second audio chunks, ordered upload and stale-chunk dropping |
| `avatar/player.js` | Queue, motion validation/interpolation, canvas avatar, videos, floating window |
| `avatar/player.css` | Scoped floating-player styles |
| `avatar/index.html` | Standalone text demo |
| `avatar/window.html` | Popup receiving plans from its opener |
| `avatar/record.html` | Camera-only local video recorder |
| `avatar/capture.html`, `avatar/capture.js` | Live camera-to-avatar motion capture, review, save and import |
| `avatar/tracking.js` | MediaPipe setup, wrist-based hand assignment and normalized motion sampling |
| `avatar/library.js` | Local IndexedDB motion library |
| `avatar/signs/manifest.json` | Language label and team-owned asset paths |
| `scripts/extract_motion.py` | Offline video-to-landmark conversion |
| `backend/tests/test_gloss.py` | Vocabulary, validation and no-key fallback checks |

The avatar is a 2D renderer, not a trained generative sign model. Motion format is `{"gloss":"HELLO","fps":30,"frames":[{"pose":[[x,y]],"lh":null,"rh":null}]}`; `pose` has exactly 7 points in MediaPipe order `[0,11,12,13,14,15,16]`, hands have 21 points each or are null. Coordinates use each frame's shoulder midpoint as origin and shoulder width as unit. Hand assignment minimizes distance to the two pose wrists, ignoring handedness labels. Missing pose samples hold the previous body pose with hands hidden; exports fail if more than 20% of samples lack a usable pose.

## Optional LLM

Set `TRANSLATION_ANALYZER=llm` explicitly to enable optional meaning proposals. Set `GLOSS_API_URL`, `GLOSS_MODEL` and, if required, `GLOSS_API_KEY` in the server environment; `.env` files are not auto-loaded. Unsupported sentences may then be sent to that endpoint. Remote endpoints require HTTPS; localhost compatible models can run without a key. The default `rules` path is local. Model proposals always require review and cannot invent signs or approve themselves. See [translation details](docs/TRANSLATION.md). Never put keys in browser code or commit `.env`.

`CORS_ORIGINS` is a comma-separated allowlist for the teammate's UI origin. Default bind is localhost. The standard-library server is a local hackathon demo server, not a production deployment. Integrate the planner into the team's FastAPI backend for hosting. Deploy the static `avatar` assets with the teammate's frontend and configure its backend URL there.

## Verification

```sh
python -m unittest discover -s backend/tests -v
node --test avatar/player.test.js avatar/tracking.test.js
```

Optional browser checks: install Playwright in a separate development environment with Chrome available, start the local server, and run `node scripts/browser_smoke.cjs` and `node scripts/capture_smoke.cjs`. The latter uses a fake camera; it verifies real tracking-model startup and library integration, not a human sign's accuracy. Its synthetic motion fixture is test data, not a sign asset.

`node scripts/translation_smoke.cjs` checks the real translation API/UI without mocked responses: negation, literal age/name values, review state and missing-asset gating. Backend tests also use clearly synthetic approval fixtures to verify the validated/preview paths; no real catalog approvals are changed by tests.

`node scripts/floating_smoke.cjs` verifies real Chrome Document PiP, detached motion rendering while another tab is active, reopening, and releasing synthetic audio tracks when the window closes. `live_smoke.cjs` also exercises regular-popup video playback with synthetic fixtures.

For the live-audio browser check, run `python scripts/make_test_video.py`, then `node scripts/live_smoke.cjs`. This generates a solid-color video fixture and uses synthetic audio/STT responses to test complete chunk files, phrase matching across boundaries, and ordered popup video playback. It is not an accuracy or comprehension test. Local Whisper was separately verified against the existing `capture.webm`; processing took approximately 8–9 seconds for that sample on this run. End-to-end YouTube latency and signing comprehension remain unmeasured.

The pre-existing speech test uses faster-whisper; preserve `av<17` when installing it. Its `base.en` model, downloaded weights and dependencies are separate from the no-key text demo.

## AI usage

Codex assisted with implementation, documentation and automated tests during this working session. Team members must review and be able to explain each file. faster-whisper performs local speech recognition. The active ASL word matcher uses deterministic rules, with no LLM or private credentials. MediaPipe supports the earlier capture tools. The active demo includes third-party Kozha SiGML sign data and loads UEA's CWASA avatar, explicitly attributed in `THIRD_PARTY.md`; neither was authored by our team. Earlier optional LLM meaning analysis remains in the research modules but is not used by the active HTTP pipeline.

## Honest limitations

- Proof of concept on a small vocabulary; this is not a general sign-language translator.
- The active demo supplies 14 unverified ASL word signs, not SLSL. Deaf-native review is pending. Earlier team signs are recorded from public references and are not verified by a certified signer; those recordings are signer-dependent.
- Stitched signs do not capture sign-language grammar or facial expression. The rule planner is a limited word mapper; moving WHAT last does not establish grammatical correctness.
- The intended speech pipeline has a near-live delay of 3–6 seconds. That is a target, not measured end-to-end latency for this component; optional LLM timeouts and playback backlog can add delay.
- Active ASL signing is limited to the 14 entries in `avatar/signs/manifest.json`. It matches supported words in English order, not complete sentence meaning or ASL grammar. Chunk boundaries can cut words and reduce transcription accuracy. Playback can lag behind rapid speech.
- No recordings, measured WER, comprehension results or validated signing accuracy are included yet. Text-only missing-letter display is explicitly labeled.
- Shoulder-normalized 2D tracking loses depth, orientation and subtle hand shapes. Hands may be misassigned during crossing or occlusion; review every sign.
- Playback accepts at most 25 tokens per plan and skips incoming plans when the pending queue would exceed 50 tokens. Captions still update. Spell words are capped at 32 letters. This can omit information; use short utterances and keep captions visible.

MIT license covers project code. Final submission still needs the team's public GitHub repository, recording review, results, AI disclosure review, fallback demo video and MLH OrganizerHQ submission. Freeze features 45 minutes before the deadline and rehearse the three-minute demo with 90 seconds live.
