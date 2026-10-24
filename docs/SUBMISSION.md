# SignBridge — submission notes

## Project description

SignBridge pairs real English captions with a floating 3D signing avatar for Deaf and hard-of-hearing viewers. It captures browser-tab or microphone audio, runs local AI speech recognition, and queues supported ASL word signs while keeping unsupported speech visible in captions. Our hackathon MVP demonstrates 14 unverified ASL signs, rather than claiming complete ASL or SLSL interpretation.

## Deliverables

| Deliverable | Included |
| --- | --- |
| Functional web MVP | On-page/floating avatar, real microphone/tab capture, captions and signing queue |
| AI functionality | Local faster-whisper English speech-to-text |
| GitHub repository | Team repository, main branch; see root README |
| README | Problem, solution, setup, stack, AI usage, limitations, licence and demonstration |
| Project description | This document and root README |
| Technology stack | README architecture table |
| Working live demonstration | Speak the script below using microphone mode, or share an audio-enabled browser tab |
| Deployed web URL | Temporary HTTPS tunnel, once running; keep laptop and processes on |
| Demo video | Not included; optional unless an assigned challenge requires it |

## Suggested three-minute presentation

- 0:00–0:30: Explain the access problem and who the prototype serves.
- 0:30–0:55: Explain audio → local Whisper → limited ASL dictionary → avatar, with captions retained.
- 0:55–2:25: Show the real avatar, then use live microphone speech or tab audio. The text-demo button is explicitly a separate rendering test.
- 2:25–3:00: Disclose the vocabulary/review/grammar limitations and propose Deaf-led evaluation and SLSL expansion.

## Live script: all 14 signs

Hello, mother. Hello, father. Want help? Yes. Learn a name. Want a house? No. Eat. Good. Finish. Thank you.

Read slowly, with pauses. There are 16 sign tokens because HELLO and WANT repeat. This is a small vocabulary dialogue; English word order is preserved and ASL sentence grammar is not generated.

## Essential disclosure

The active demo is ASL, not SLSL. It uses 14 third-party SiGML entries without Deaf-native review and a third-party UEA CWASA avatar, with separate licences and attribution. It is not a replacement for a qualified interpreter. Stitched word signs do not reproduce full grammar or facial expression. Processing delay varies; 3–6 seconds is a target, not a guaranteed result.

Earlier team-recording work used public references and was not certified-signer verified. Original models, libraries and sign data are attributed, not claimed as hackathon-authored code. See README AI usage and THIRD_PARTY.md.

## Final submission

Copy the GitHub repository URL and verified public HTTPS demo URL into MLH OrganizerHQ. Confirm any challenge-specific video requirement, keep the laptop powered and awake, and rehearse the live microphone flow once before presenting.
