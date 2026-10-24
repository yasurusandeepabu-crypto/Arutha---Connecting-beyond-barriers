# Translation agent: implemented scope

**Current active demo:** HTTP audio/translation routes now use the ASL lexical preview in `backend/asl.py`. See [ASL_DEMO.md](ASL_DEMO.md). This document describes the earlier SLSL semantic-catalog experiment, retained for future work; those checks do not make the active ASL word matching a sentence translator.

The PDF's staged design is implemented as a conservative subset, not a complete general-purpose SLSL translator. English meaning analysis, SLSL transfer data and playback are separate. The local path needs no extra packages or private credentials.

## Pipeline

1. `backend/interpret.py` buffers complete sentences across chunks, waiting for punctuation, a silent chunk or an explicit flush. Missing audio clears incomplete sentences. STT punctuation can still be wrong.
2. `backend/semantics.py` handles common contractions and supported predicates, roles, literal name/age/place slots, polarity, questions, basic time and modality. English meanings are independent of the transfer catalog. Unknown input is retained and flagged. This is not a full parser or coreference resolver.
3. `backend/translation.py` compares the complete supported meaning signature to `backend/catalog.json`. Age nineteen cannot select AGE-NINE; negation, past time and questions cannot select the positive present LIKE-CATS construction. Whole-phrase transfer is the only SLSL construction implemented. No productive SLSL grammar is invented.
4. The selected construction is converted back to its meaning signature for comparison. This checks internal consistency; it cannot detect incorrect linguistic knowledge shared by the tables. Fluent signer comprehension review remains necessary.
5. Results contain frames, source spans, flags, candidate units, review status, confidence metadata, playable tokens and a sequential clip timeline. Actual durations come from playback. No facial tracks or gloss annotations are fabricated.

## Catalog and review evidence

All current entries are `PENDING`; no signer approval is claimed. `VALIDATED` must mean a fluent SLSL reviewer actually reviewed the complete rendered phrase, including meaning, order, fingerspelling and facial grammar.

Only after review, update that entry's status and provenance in `backend/catalog.json`: `status`, `provenance.reviewers` (actual reviewer identifiers), `reviewed_at` (actual ISO date), and `source` (reference URL/timestamp and review record). Never treat filling these fields as a substitute for review. Keep corrections in version history. Changed clips or meanings require renewed review.

Automatic playback requires a matching meaning, validated status, complete provenance, supported deterministic English analysis and a local file under `avatar/signs/` referenced by the manifest. Metadata checks cannot prove reviewer fluency, a review actually happened, or a clip is linguistically accurate. File presence does not prove valid encoding.

The live page offers **Preview unverified team clips (review only)**, off by default. Existing matched clips may then play with `REVIEW_REQUIRED`, flags and an unverified badge. Preview never changes catalog status. Missing assets never receive invented signs.

`gloss_sequence` remains empty until genuine reviewed SLSL gloss annotations are supplied. GREETING and similar strings are clip IDs, not SLSL text.

## API

`POST /api/translate` (also `/api/gloss` for compatibility):

```json
{"text":"I am nineteen years old.","preview_unverified":false}
```

The response exposes age `19` and flags the missing construction, rather than selecting AGE-NINE. `tokens` contains eligible playable clips; `translations[].construction_id` and `sign_sequence.units` may contain candidates even when playback is blocked.

Streaming `/api/interpret` accepts `preview_unverified`; `/api/audio` accepts `X-Preview-Unverified: 1` for review preview, default 0. The client locks the setting during capture. `GET /api/catalog` lists definitions and provenance. No API writes review approvals.

States: `AUTO_OK`, `REVIEW_REQUIRED`, `WAITING`, `NO_INPUT`. AUTO_OK means implemented evidence checks passed, not certified accuracy. Confidence stays `{"overall":null,"calibrated":false}` until measured evaluation exists; consistency checks are not probabilities.

## Optional LLM analysis

Set `TRANSLATION_ANALYZER=llm`, `GLOSS_API_URL` to a full chat-completion endpoint, and `GLOSS_MODEL`. Set `GLOSS_API_KEY` if required by that provider. Remote URLs require HTTPS; local compatible endpoints may use localhost HTTP without a key. Environment files are not auto-loaded.

Only unsupported sentences are sent, within the first two completed sentences per audio request. Calls time out after five seconds each and can add latency. With `rules`, no transcript is sent to an LLM.

The model proposes meaning fields, not sign IDs, rules, approvals or confidence scores. Its JSON, source slots and basic negation/time/modality/question invariants are checked. Model-derived matches always require review, even for validated target phrases; only explicit preview can play them. Failed responses fall back to local analysis and flags. These checks cannot prove every nuance is preserved.

The earlier `backend/gloss.py` is an isolated word-planning experiment, no longer called by a translation endpoint.

## Remaining work

Validated lexical senses and productive grammar rules, full parsing and discourse/coreference, idioms, signing-space tracking, number/date systems, facial/non-manual synthesis, retargeting checks, calibrated confidence and measured signer comprehension. An LLM does not supply those resources. Keep captions visible for uncovered speech.
