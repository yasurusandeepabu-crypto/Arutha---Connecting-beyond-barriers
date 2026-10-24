# SignBridge

Hack for Humanity · AI Collective Colombo · MLH-supported

**Live English captions and a signing avatar that stays beside your video.**

SignBridge captures English speech from a browser tab or microphone, transcribes it locally with faster-whisper, and plays supported ASL word signs on a 3D avatar. The avatar can appear in the website or move into Chrome’s always-on-top Picture-in-Picture window.

**Current scope: 14 unverified ASL word signs, not full English-to-ASL translation or Sri Lankan Sign Language (SLSL).** Captions retain unsupported speech. SLSL remains a future goal.

## Submission links

- Repository: https://github.com/yasurusandeepabu-crypto/Arutha---Connecting-beyond-barriers
- Local demonstration: http://127.0.0.1:8000
- Public HTTPS demo: https://upgrades-providing-certain-programmer.trycloudflare.com (temporary; team laptop and tunnel must stay running).
- Project description and demo script: [submission notes](docs/SUBMISSION.md).

## Problem and solution

Deaf and hard-of-hearing viewers can miss spoken information in online videos. Captions are useful, but viewers may also prefer signed communication.

Our MVP combines real English captions with a small ASL word-sign preview in a movable companion. It demonstrates the audio-to-avatar pipeline and makes vocabulary gaps visible, rather than inventing signs. It is a prototype to support future development with Deaf signers, not an accessibility replacement for a qualified interpreter.

## Features

- Real browser-tab audio sharing and microphone capture.
- Local AI speech recognition, without private API credentials.
- On-page 3D avatar and floating companion; the same player moves between them.
- Sequential SiGML playback for 14 ASL dictionary entries.
- Visible captions, supported vocabulary, queued tokens and unverified-output warnings.
- A clearly labelled text demo, separate from live speech recognition.
- Caption-only handling for unsupported words and detected negated/conditional clauses.

## Technology stack and architecture

| Layer | Technology |
| --- | --- |
| Website | Next.js static export, React, TypeScript, Tailwind/CSS |
| Audio capture | Browser MediaRecorder, getDisplayMedia, getUserMedia |
| Backend | Python standard-library threaded HTTP server |
| AI speech recognition | faster-whisper `base.en`, CPU/int8, beam size 1 |
| Word selection | Local deterministic whitelist and limited context checks |
| Sign notation | 14 ASL SiGML entries from Kozha, with retained provenance |
| 3D avatar | UEA CWASA, standard Anna avatar, loaded unmodified |
| Floating window | Chrome Document Picture-in-Picture, regular popup fallback |
| Optional research tools | MediaPipe pose/hand tracking and team-recording utilities |

`Tab/microphone → complete 4-second audio chunks → local Whisper → supported word tokens → bounded queue → SiGML → CWASA avatar`

Captions remain available when vocabulary or animation is unavailable. Sentence buffering, queue limits and stale-audio skipping reduce backlog but can omit speech when processing is too slow.

## Setup: no private keys required

Requirements: desktop Chrome, Node.js 20.9+ and Python 3.13 recommended. Allow microphone or tab sharing when prompted. The avatar engine and first Whisper-model download need internet.

```sh
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Git Bash / Linux / macOS:

```sh
# Windows Git Bash:
source venv/Scripts/activate
# Linux/macOS instead: source venv/bin/activate
```

Then:

```sh
python -m pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
python -m backend.main
```

Open **http://127.0.0.1:8000**. One Python server serves the built website, sign assets and API. Python text matching needs no additional packages; speech recognition needs the listed dependencies. `av` is constrained below 17 for faster-whisper compatibility.

The included sign assets are ready to use. `python scripts/setup_asl.py` can reproduce their extraction from a pinned upstream revision. No API keys, `.env`, recordings, virtual environments or downloaded models belong in Git. `.env.example` documents optional settings; environment files are not loaded automatically.

## Live demonstration

1. Open the website and wait for the real avatar in the demo section.
2. **Play 14-sign text demo** checks rendering and the queue without speech recognition.
3. For real AI functionality, choose **Load speech engine** if shown, then **Use microphone** and read the script slowly, pausing after each sentence.
4. Alternatively choose **Open companion**, then **Share tab audio**, select the video tab and enable its audio-sharing checkbox.
5. Switch to the video. The floating avatar remains visible in supported desktop Chrome. Closing it returns the player to the website and stops capture.

> Hello, mother. Hello, father. Want help? Yes. Learn a name. Want a house? No. Eat. Good. Finish. Thank you.

This deliberately limited dialogue covers all 14 signs, with HELLO and WANT repeated: 16 sign tokens. The article “a” is omitted. It is not an example of verified ASL sentence grammar. For the safest live demonstration, speak short sentences and let the queue catch up.

Supported signs: `HELLO`, `THANK-YOU`, `YES`, `NO`, `MOTHER`, `FATHER`, `EAT`, `GOOD`, `NAME`, `WANT`, `FINISH`, `HOUSE`, `LEARN`, `HELP`.

## Checks and measured results

```sh
python -m unittest discover -s backend/tests
node --test avatar/player.test.js avatar/tracking.test.js
cd frontend
npm run build
```

Recorded checks in this working session:

- 39 backend tests and 7 JavaScript tests passed.
- Production build and TypeScript checks passed.
- All 14 SiGML files generated actual animation frames in Chrome Picture-in-Picture. This establishes rendering, not sign correctness.
- The visible website demo played all 16 queued animations covering the 14 unique signs; moving the player into PiP and back passed.
- Microphone capture, complete WebM chunks, cleanup and mobile layout were checked with synthetic audio and mocked speech responses. Local Whisper was separately tested with actual captured speech.
- The existing speech sample took approximately 7 seconds without competing browser tests and 27 seconds under test load. These are STT measurements, not end-to-end latency guarantees.

Browser checks in `scripts/` use Playwright and installed Chrome; Playwright is an optional development dependency, not needed to run the MVP. Linguistic comprehension, WER and general translation accuracy have not been measured.

## AI usage and authorship

faster-whisper performs real AI speech-to-text locally. The active ASL word selector uses deterministic rules; an LLM does not generate sign movements or ASL grammar. Codex assisted with implementation, debugging, documentation and tests. Team members must review and be able to explain the code.

The UI was supplied by the team’s `UI` branch and integrated with the working pipeline. CWASA, Whisper, MediaPipe and the ASL dictionary are existing dependencies/data and are explicitly attributed; they are not claimed as event-authored work. The original recording plan used team performances based on public references, not verified by a certified signer. Those research tools remain available; the active 14-sign demo uses the attributed third-party SiGML dictionary.

## Limitations

- A small-vocabulary proof of concept, not a general sign-language translator.
- Active output is ASL, not SLSL. All 14 signs lack Deaf-native review and may be incorrect or signer-dependent.
- Word signs follow English order. Stitched signs do not capture full sign-language grammar, facial expression or spatial discourse.
- The intended near-live delay of 3–6 seconds is a target, not a guarantee. CPU speed, speech recognition, internet and queue backlog can increase it substantially.
- Four-second chunk boundaries and STT errors can lose or alter words. Backlog/stale-chunk limits can omit audio and signing.
- Unknown words have captions only; no unverified fingerspelling is invented. Simple context checks do not provide general semantic understanding.
- Avatar resources require internet and UEA service availability. There is no guaranteed offline 3D renderer or production uptime.
- The Python server and temporary public tunnel are for a hackathon demonstration, not a hardened multi-user production service.

## Licensing and project files

Project-authored code is [MIT licensed](LICENSE). Third-party sign data, avatar assets, fonts and dependencies retain their own terms. In particular, the ASL metadata specifies CC BY-NC 4.0, and CWASA has separate unmodified-use conditions. These are **not** relicensed MIT. See [THIRD_PARTY.md](THIRD_PARTY.md) and [ASL data notice](avatar/signs/asl/NOTICE.md).

- `backend/`: HTTP API, local STT, ASL word matching, session buffering and retained SLSL research modules.
- `frontend/`: integrated SignBridge website and visible session controls.
- `avatar/`: player, floating-window integration, audio capture, CWASA wrapper and attributed sign data.
- `scripts/`: reproducible data setup and development checks.
- `docs/`: deployment, submission notes, file explanations and historical research documentation.

[ASL files explained](docs/ASL_DEMO.md) · [Deployment](docs/DEPLOYMENT.md) · [Submission notes](docs/SUBMISSION.md)
