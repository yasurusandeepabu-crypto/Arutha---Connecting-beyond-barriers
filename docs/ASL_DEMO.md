# ASL avatar demo

The active HTTP pipeline is English tab audio → local faster-whisper → supported English word matching → local ASL SiGML files → UEA CWASA Anna → floating window. No private credentials are needed. This is an **unverified ASL lexical preview**, not a complete English-to-ASL translator. SLSL is not supplied by this dictionary.

## Run

The 14 ASL signs are bundled with attribution. To reproduce the data extraction, run `python scripts/setup_asl.py` (internet needed). Build the website with `npm ci` and `npm run build` in `frontend/`, then run `python -m backend.main` from the project root.

Open http://127.0.0.1:8000 in desktop Chrome. Open the companion and wait for the avatar. Under Team tools, use the no-key text test before sharing audio:

The homepage now includes the real avatar directly in a visible demo section. **Play 14-sign text demo** queues the script below without speech recognition. **Use microphone** captures real speech through the same local STT pipeline after loading the model. Read slowly with pauses. **Open companion** moves the same player into PiP; closing PiP returns it to the page. One renderer is active at a time.

> Hello, mother. Hello, father. Want help? Yes. Learn a name. Want a house? No. Eat. Good. Finish. Thank you.

This covers all 14 dictionary signs, with HELLO and WANT repeated (16 sign tokens). The article "a" is omitted by the word matcher. It is a deliberately limited demonstration dialogue, not an example of verified ASL grammar.

> Hello. Thank you. Yes. No. Mother. Father. Eat. Good. Name. Want. Finish. House. Learn. Help.

For live audio, load the local speech model and share the YouTube tab with tab audio enabled. The old Julie video has many unsupported words; captions remain complete, but only covered words can animate. No prerecorded transcript replaces speech recognition.

## Files to explain

| File | Purpose |
| --- | --- |
| `backend/asl.py` | Whitelisted word matching, explicit unsupported words and review warnings |
| `backend/interpret.py` | Existing sentence buffering, sequence checks and queue limits; accepts a lexical reporter |
| `avatar/signs/manifest.json` | Active 14-sign ASL asset map |
| `avatar/signs/asl/` | Original dictionary/metadata, extracted SiGML, source hashes and separate data notice |
| `avatar/cwasa-frame.html` and `.js` | Isolated renderer page; loads the unmodified UEA engine and standard Anna avatar |
| `avatar/cwasa-player.js` | Waits for avatar readiness, forwards sign playback, handles completion/stop/window close |
| `avatar/player.js` | Existing bounded sequential queue, captions, SiGML selection and original motion/video support |
| `scripts/setup_asl.py` | Reproducible extraction from a pinned Kozha revision |

## Limits and dependencies

- Only 14 lexical signs; output follows English word order. ASL grammar, facial grammar and general sentence translation are not generated.
- All signs lack Deaf-native review. Successful rendering is not evidence of linguistic correctness. Signs may be incorrect or signer-dependent.
- Unsupported words remain in captions; no invented signs or unrecorded fingerspelling. Negated and conditional clauses are caption only to avoid positive signing that reverses their meaning. This is a narrow heuristic, not general semantic understanding.
- Audio chunks are 4 seconds; total delay varies with transcription and playback backlog. A 3–6 second delay is a target, not a guaranteed measurement.
- Audio uploads allow up to 60 seconds for a slow laptop. The existing bounded backlog and stale-chunk skipping still apply; this can omit audio when processing falls behind. The existing audio sample took about 7 seconds without competing browser tests, versus 27 seconds while those tests were running. These are speech-processing times, not complete end-to-end latency. Rehearse without competing test processes.
- Internet is required for UEA's public CWASA engine and avatar resources. Local captions/text matching need no private API credentials. On engine failure, the UI reports failure and preserves captions.
- Engine resources load remotely; local SiGML is sent to the renderer frame. This setup uses client-side animation generation and no external speech transcription service.
- [Kozha data](https://github.com/zhan-a/Kozha) retain their metadata and CC BY-NC notice. UEA engine assets retain [CWASA's conditions](https://vh.cmp.uea.ac.uk/index.php/CWASA_Conditions_of_Use). Neither is relicensed MIT. See `THIRD_PARTY.md`.

The original team-recording tools and SLSL research modules remain available for future work. The current website and HTTP translation routes use the ASL demo.
