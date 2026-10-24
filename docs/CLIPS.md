# Clips for the YouTube demonstration

Place your own SLSL avatar clips in `avatar/signs/clips/`. A clip can contain a complete phrase. Export silent WebM or MP4 with the whole signing area visible. Each clip must be shorter than 15 seconds; split longer interpretations. Use the same avatar, camera and resting pose across clips.

| Filename | Meaning to sign, using SLSL order |
| --- | --- |
| `GREETING.webm` | Hello everyone, nice to meet you. |
| `INTRODUCTION.webm` | Let me introduce myself. |
| `NAME-JULIE-ANDERSON.webm` | My name is Julie Anderson. |
| `AGE-NINE.webm` | I'm nine years old. |
| `FROM-SOUTH-AFRICA.webm` | I'm from South Africa. |
| `LIKE-PANCAKES-HOT-DOGS.webm` | I like pancakes and hot dogs. |
| `LIKE-YELLOW.webm` | I like yellow. |
| `LIKE-CATS.webm` | I like cats. |
| `MORE-ABOUT-ME.webm` | Now you know more about me. |
| `HOPE-FRIENDS.webm` | I hope we can be friends. |

Start with the first three. These are clip identifiers and intended meanings, not invented SLSL glosses. The team must establish and review the actual SLSL signing. Do not use an English letter alphabet and call it SLSL fingerspelling without verification.

For each available clip, add an entry under `phrases` in `avatar/signs/manifest.json`:

```json
"GREETING": {"video":"clips/GREETING.webm"}
```

Or use a captured motion JSON instead:

```json
"GREETING": {"motion":"clips/GREETING.json"}
```

Include both paths to use a video if motion loading fails. Paths are relative to the manifest. Do not add entries until the actual files are supplied; missing clips are labeled on screen.

The live page uses these phrase assets, not the individual word-sign library. Captured JSON can be renamed/relabelled as a phrase asset once reviewed. Downloaded JSON must have the player's seven pose points and optional 21 points per hand.

English matches and alternate wordings live in `backend/phrases.json`. The matcher waits across chunk boundaries for a complete phrase, preserves order, and never selects a phrase from a video timestamp. It does not generate grammar or translate arbitrary speech; unsupported words stay in captions. It accepts different sentences only when their variants are explicitly supported.
