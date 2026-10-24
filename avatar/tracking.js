export const POSE_IDS = [0, 11, 12, 13, 14, 15, 16];

export function assignHands(hands, wrists) {
  const distance = (hand, wrist) => Math.hypot(hand[0].x - wrist.x, hand[0].y - wrist.y);
  const result = [null, null];
  if (hands.length === 1) result[distance(hands[0], wrists[0]) <= distance(hands[0], wrists[1]) ? 0 : 1] = hands[0];
  if (hands.length >= 2) {
    const straight = distance(hands[0], wrists[0]) + distance(hands[1], wrists[1]);
    const crossed = distance(hands[0], wrists[1]) + distance(hands[1], wrists[0]);
    const order = straight <= crossed ? [0, 1] : [1, 0];
    result[0] = hands[order[0]];
    result[1] = hands[order[1]];
  }
  return result;
}

export function normalizeFrame(pose, hands) {
  if (!pose || pose.length < 33 || [11, 12, 13, 14, 15, 16].some(i => (pose[i].visibility ?? 1) < .5)) return null;
  const a = pose[11], b = pose[12];
  const width = Math.hypot(a.x - b.x, a.y - b.y);
  if (!Number.isFinite(width) || width < .05) return null;
  const center = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const normalize = points => points ? points.map(p => [Number(((p.x - center[0]) / width).toFixed(5)), Number(((p.y - center[1]) / width).toFixed(5))]) : null;
  const [left, right] = assignHands(hands, [pose[15], pose[16]]);
  return { pose: normalize(POSE_IDS.map(i => pose[i])), lh: normalize(left), rh: normalize(right) };
}

export function makeMotion(samples, gloss) {
  if (samples.length < 5) throw new Error('Capture at least five tracked frames.');
  const valid = samples.filter(s => s.frame);
  if (valid.length / samples.length < .8) throw new Error('Too much missing body tracking. Keep elbows and wrists visible and try again.');
  if (!valid.some(s => s.frame.lh || s.frame.rh)) throw new Error('No hands tracked. Move your hands into view and try again.');
  const start = samples[0].time, end = samples.at(-1).time;
  if (end - start < 300) throw new Error('Capture a slightly longer movement.');
  const fps = 30;
  const frames = [];
  let index = 0;
  let previous = { pose: valid[0].frame.pose, lh: null, rh: null };
  for (let time = start; time <= end; time += 1000 / fps) {
    while (index + 1 < samples.length && samples[index + 1].time <= time) index++;
    const sample = samples[index];
    const next = sample.frame && time - sample.time < 200 ? sample.frame : { pose: previous.pose, lh: null, rh: null };
    frames.push(next);
    previous = next;
  }
  return { gloss, fps, frames };
}

export async function createTracker() {
  const { FilesetResolver, PoseLandmarker, HandLandmarker } = await import('./vendor/mediapipe/vision_bundle.mjs');
  const files = await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm', import.meta.url).href);
  let pose, hands;
  try {
    pose = await PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: new URL('./models/pose_landmarker_lite.task', import.meta.url).href },
      runningMode: 'VIDEO', numPoses: 1,
    });
    hands = await HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: new URL('./models/hand_landmarker.task', import.meta.url).href },
      runningMode: 'VIDEO', numHands: 2,
    });
    return {
      detect(video, timestamp) {
        const body = pose.detectForVideo(video, timestamp);
        const fingers = hands.detectForVideo(video, timestamp);
        return normalizeFrame(body.landmarks[0], fingers.landmarks);
      },
      close() { pose.close(); hands.close(); },
    };
  } catch (error) {
    pose?.close(); hands?.close(); throw error;
  }
}
