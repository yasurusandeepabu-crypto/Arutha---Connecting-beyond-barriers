import { SignBridgePlayer, validMotion } from './player.js';
import { createTracker, makeMotion } from './tracking.js';
import { saveMotion, listMotions, deleteMotion } from './library.js';

const $ = id => document.getElementById(id);
const player = new SignBridgePlayer({ canvas: $('avatar'), video: $('playback'), status: $('avatar-status'), caption: $('caption') });
let tracker, stream, samples = [], capturing = false, reviewing = false, clip = null, clipType = 'sign';
let lastDetection = 0, lastVideoTime = -1, animation, captureStart = 0, captureLabel, captureType, starting = false;

function setCaptureButtons(active) {
  $('record').disabled = active || !stream;
  $('stop').disabled = !active;
  $('label').disabled = $('type').disabled = active;
  for (const id of ['review', 'save', 'download']) $(id).disabled = active || !clip;
  $('import').disabled = active;
  $('live').disabled = active || !stream;
}

function finish() {
  if (!capturing) return;
  capturing = false;
  try {
    clip = makeMotion(samples, captureLabel);
    if (!validMotion(clip)) throw new Error('Tracking produced invalid coordinates. Please capture again.');
    clipType = captureType;
    $('message').textContent = `Captured ${clip.gloss}: ${(clip.frames.length / clip.fps).toFixed(1)} seconds. Replay, check, then save.`;
  } catch (error) { clip = null; $('message').textContent = error.message; }
  setCaptureButtons(false);
}

function loop(timestamp) {
  if (!stream) return;
  try {
    if ($('camera').readyState >= 2 && timestamp - lastDetection >= 1000 / 30 && $('camera').currentTime !== lastVideoTime) {
      lastDetection = timestamp;
      lastVideoTime = $('camera').currentTime;
      const frame = tracker.detect($('camera'), timestamp);
      if (!reviewing) {
        if (frame) player.draw(frame);
        else player.draw({ ...player.frame, lh: null, rh: null });
      }
      const hands = frame ? Number(!!frame.lh) + Number(!!frame.rh) : 0;
      $('quality').textContent = frame ? `Upper body tracked · ${hands}/2 hands visible${capturing ? ` · capturing ${((timestamp - captureStart) / 1000).toFixed(1)} s` : ''}` : 'Tracking lost: show shoulders, elbows and wrists. Hidden fingers cannot be reconstructed.';
      if (capturing) {
        samples.push({ time: timestamp, frame });
        if (timestamp - captureStart >= 8000) finish();
      }
    }
    animation = requestAnimationFrame(loop);
  } catch (error) { $('message').textContent = `Tracking stopped: ${error.message}`; turnOff(); }
}

function turnOff() {
  finish();
  const old = stream;
  stream = null;
  cancelAnimationFrame(animation);
  old?.getTracks().forEach(track => track.stop());
  $('camera').srcObject = null;
  tracker?.close(); tracker = null;
  $('start').disabled = starting;
  $('off').disabled = true;
  $('quality').textContent = 'Camera is off.';
  setCaptureButtons(false);
}

$('start').onclick = async () => {
  if (starting) return;
  starting = true;
  $('start').disabled = true;
  $('message').textContent = 'Loading local tracking models…';
  try {
    tracker = await createTracker();
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 720, frameRate: 30 }, audio: false });
    $('camera').srcObject = stream;
    await $('camera').play();
    stream.getVideoTracks()[0].addEventListener('ended', turnOff, { once: true });
    reviewing = false; lastDetection = 0; lastVideoTime = -1;
    $('off').disabled = false;
    setCaptureButtons(false);
    $('message').textContent = 'Tracking ready. Enter a sign label and capture one short movement.';
    animation = requestAnimationFrame(loop);
  } catch (error) {
    turnOff();
    $('message').textContent = `Cannot start: ${error.message}. For missing model files, run python scripts/setup_tracking.py first. Check camera permission too.`;
  } finally { starting = false; $('start').disabled = !!stream; }
};
$('off').onclick = turnOff;
$('record').onclick = () => {
  captureLabel = $('label').value.trim().toUpperCase();
  captureType = $('type').value;
  if (!/^[A-Z]+(?:-[A-Z]+)*$/.test(captureLabel) || (captureType === 'letter' && !/^[A-Z]$/.test(captureLabel))) {
    $('message').textContent = 'Use an A–Z sign label (hyphens allowed), or exactly one letter.'; return;
  }
  player.stop(); reviewing = false; clip = null; samples = [];
  capturing = true; captureStart = performance.now();
  setCaptureButtons(true);
  $('message').textContent = `Capturing ${captureLabel} now. Perform the sign once, then finish. Maximum 8 seconds.`;
};
$('stop').onclick = finish;
async function review(motion) {
  reviewing = true;
  player.stop();
  await player.playAsset({ motionData: motion }, motion.gloss, player.generation);
}
$('review').onclick = () => { if (clip) review(clip); };
$('live').onclick = () => { reviewing = false; player.stop(); };
$('save').onclick = async () => {
  try {
    await saveMotion(clip, clipType);
    $('message').textContent = `Saved ${clip.gloss} locally. Open the text player on this same address to use it. Download a backup for your teammate.`;
    await refreshLibrary();
  } catch (error) { $('message').textContent = error.message; }
};
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(clip)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${clip.gloss}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
$('import').onchange = async e => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5_000_000) throw new Error('Motion file must be under 5 MB.');
    const motion = JSON.parse(await file.text());
    await saveMotion(motion, $('type').value);
    await refreshLibrary();
    $('message').textContent = `Imported ${motion.gloss} into the local SLSL library.`;
  } catch (error) { $('message').textContent = error.message; }
  finally { e.target.value = ''; }
};
async function refreshLibrary() {
  const list = $('library'); list.replaceChildren();
  try {
    const clips = await listMotions();
    if (!clips.length) list.textContent = 'No saved signs yet.';
    for (const item of clips) {
      const row = document.createElement('li');
      row.append(`${item.type === 'letter' ? 'Letter' : 'Sign'} ${item.motion.gloss} · ${(item.motion.frames.length / item.motion.fps).toFixed(1)} s `);
      const play = document.createElement('button'); play.textContent = 'Replay'; play.onclick = () => { if (!capturing) review(item.motion); };
      const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.onclick = async () => {
        try { await deleteMotion(item.id); await refreshLibrary(); }
        catch (error) { $('message').textContent = error.message; }
      };
      row.append(play, remove); list.append(row);
    }
  } catch { list.textContent = 'Browser storage unavailable. Download motion JSON instead.'; }
}
window.addEventListener('pagehide', turnOff);
refreshLibrary();
