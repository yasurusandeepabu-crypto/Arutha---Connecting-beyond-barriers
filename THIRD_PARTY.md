# Tracking dependencies

## Website design and dependencies

The Arutha website layout and illustration were supplied by the team through its GitHub UI branch, as recorded in [UI_INTEGRATION.md](docs/UI_INTEGRATION.md). The illustration is a concept preview, not a signing animation or evidence of signer validation.

The frontend uses Next.js, React, Framer Motion, Lucide and Tailwind/PostCSS under their respective dependency licenses. Inter is distributed via `@fontsource/inter` under the SIL Open Font License; the complete license is copied into `frontend/public/licenses/inter-OFL.txt` and included in the exported website. Project MIT licensing does not replace dependency/font licenses.

Our 2D renderer, capture workflow, queue and integration code are project code. The active ASL demo uses third-party CWASA for 3D rendering. MediaPipe provides the general-purpose pose and hand detectors; it does not supply signs or translate language.

`python scripts/setup_tracking.py` downloads `@mediapipe/tasks-vision` version 0.10.21 from the npm registry into `avatar/vendor/mediapipe/`. The package declares Apache-2.0. Its package metadata and any included license/notice files are retained. [MediaPipe source and license](https://github.com/google-ai-edge/mediapipe).

The script also downloads Google's version-1 float16 Pose Landmarker Lite and Hand Landmarker model bundles into `avatar/models/`. These are third-party pretrained tracking assets, not event-authored code or SLSL sign assets. Consult the official [pose model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) and [hand model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) for model details and applicable terms.

Tracking dependencies are ignored by Git and are not relicensed under this project's MIT license. Tracking runs locally after setup. No Suvana or YouTube footage is included.

## ASL dictionary and 3D avatar

The ASL demo includes Kozha's 14-sign proof-of-concept dictionary, pinned to `ce93d533b24740879df1e84cbb5341dfa575fc1f`. Original files and metadata are retained in `avatar/signs/asl/`; individual SiGML files are extracted without changing notation. See [data attribution and licence](avatar/signs/asl/NOTICE.md). Upstream metadata declares CC BY-NC 4.0 and zero Deaf-native reviewers. This data is not MIT and is not presented as verified ASL.

The renderer loads unmodified CWASA scripts and the standard Anna avatar from the University of East Anglia, Virtual Humans Group, Copyright UEA (2005–2026). Its software conditions are equivalent to CC BY-ND; official example pages have separate CC BY-SA terms. Our wrapper pages are project-authored against the documented API, without copying the example pages. [CWASA conditions](https://vh.cmp.uea.ac.uk/index.php/CWASA_Conditions_of_Use). CWASA was supported by the EU Dicta-Sign project. Visible credits link to both CWASA and Kozha in the floating window.
