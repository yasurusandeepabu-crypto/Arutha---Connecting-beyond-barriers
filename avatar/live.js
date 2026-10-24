import { createFloatingAvatar } from './floating-window.js';
import { TabAudioCapture } from './tab-audio.js';

const $ = id => document.getElementById(id);
let transcript = [], capturing = false, speechReady = false;
const showStatus = text => { $('status').textContent = text; };
const floating = createFloatingAvatar({
  onClose() {
    $('popout').textContent = 'Open floating avatar';
    $('window-status').textContent = 'Avatar closed. Open it again to start another session.';
    $('start').disabled = true;
    if (capturing) capture.stop();
  },
  onStopCapture() { $('stop').click(); },
});
function receive(result) {
  if (result.text) transcript.push(result.text);
  if (transcript.length > 40) transcript.shift();
  const text = transcript.join(' ');
  $('captions').textContent = text;
  $('captions').scrollTop = $('captions').scrollHeight;
  $('tokens').textContent = result.tokens.length ? result.tokens.map(t => t.value).join(' → ') : (result.pending ? `Waiting for the rest of: ${result.pending}` : 'No matching phrase in this chunk.');
  $('unsupported').textContent = result.unsupported ? `No signing match for: ${result.unsupported}` : '';
  $('latency').textContent = `Speech: ${result.stt_ms ?? '—'} ms · matching: ${result.gloss_ms} ms`;
  const reviewMessage = {AUTO_OK:'Supported signing is ready.',REVIEW_REQUIRED:'Some signing needs review. Captions remain available.',WAITING:'Waiting for the rest of the sentence.',NO_INPUT:'Ready for speech.'};
  $('review-status').textContent = result.preview_only ? 'Previewing unverified signing. Keep captions visible.' : (reviewMessage[result.review_status] || 'Signing status unavailable.');
  $('translation-flags').replaceChildren();
  for (const flag of result.flags || []) {
    const row = document.createElement('li'); row.textContent = `${flag.kind}: ${flag.note}`;
    $('translation-flags').append(row);
  }
  $('translation-report').textContent = JSON.stringify({ frames: result.frames, checks: result.translations?.map(r => ({construction_id:r.construction_id,...r.checks})), sequence: result.sign_sequence, timeline: result.timeline, confidence: result.confidence }, null, 2);
  const plan = { ...result, text };
  floating.enqueue(plan);
}
const capture = new TabAudioCapture({ onResult: receive, onStatus: showStatus, onState: state => {
  capturing = state !== 'stopped';
  $('start').disabled = capturing || !speechReady || !floating.isOpen;
  $('stop').disabled = state !== 'capturing';
  $('text-play').disabled = capturing;
  $('preview-unverified').disabled = capturing;
  floating.setCaptureState(state);
} });

$('prepare').onclick = async () => {
  $('prepare').disabled = true;
  showStatus('Loading base.en on this laptop. The first run may download model weights…');
  try {
    const response = await fetch('/api/prepare', { method: 'POST', signal: AbortSignal.timeout(180000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    speechReady = data.ready;
    $('prepare').hidden = speechReady;
    $('start').disabled = !speechReady || !floating.isOpen;
    showStatus('Speech model ready. Share the YouTube tab and enable tab audio.');
  } catch (error) { showStatus(error.message); }
  finally { $('prepare').disabled = false; }
};
$('popout').onclick = async () => {
  $('popout').disabled = true;
  try {
    const mode = await floating.open();
    $('popout').textContent = 'Show floating avatar';
    $('window-status').textContent = mode === 'always-on-top' ? 'Avatar stays above other windows. Move or resize it, then switch to YouTube. Closing it stops listening.' : 'Regular avatar window opened. This browser does not support always-on-top mode; use desktop Chrome for that.';
    $('start').disabled = capturing || !speechReady;
  } catch (error) { showStatus(`Cannot open the avatar: ${error.message}`); }
  finally { $('popout').disabled = false; }
};
$('start').onclick = async () => {
  if (capturing || !floating.isOpen) return;
  $('start').disabled = true;
  $('text-play').disabled = true;
  try {
    capture.previewUnverified = $('preview-unverified').checked;
    await capture.start();
    capturing = true;
    $('stop').disabled = false;
  } catch (error) { showStatus(error.message); $('start').disabled = !speechReady || !floating.isOpen; $('text-play').disabled = false; }
};
$('stop').onclick = async () => {
  $('stop').disabled = true;
  await capture.stop();
  capturing = false;
  $('start').disabled = !speechReady || !floating.isOpen;
  $('text-play').disabled = false;
};
$('clear').onclick = () => {
  floating.stop();
  transcript = []; $('captions').textContent = ''; $('tokens').textContent = 'Playback cleared.';
};
$('text-form').onsubmit = async e => {
  e.preventDefault(); $('text-play').disabled = true;
  try {
    const response = await fetch('/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      text: $('text').value, session_id: crypto.randomUUID(), sequence: 0, flush: true,
      preview_unverified: $('preview-unverified').checked,
    }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    receive(result);
  } catch (error) { showStatus(error.message); }
  finally { $('text-play').disabled = capturing; }
};
async function initialize() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    speechReady = data.speech.ready;
    $('prepare').hidden = speechReady;
    $('start').disabled = !speechReady || !floating.isOpen;
    showStatus(speechReady ? 'Speech model ready. Share a tab with audio enabled.' : 'Prepare speech model first, or use the text test below.');
    if (data.translation?.analyzer === 'llm') $('coverage-status').textContent += ' Optional model analysis is enabled: unsupported English text is sent to the configured endpoint for meaning proposals.';
    const { phrases } = await (await fetch('/api/phrases')).json();
    for (const phrase of phrases) {
      const row = document.createElement('li');
      row.textContent = `${phrase.meaning} → ${phrase.id} · ${phrase.configured ? 'clip configured' : 'awaiting your clip'} · ${phrase.validation_status || 'UNKNOWN'}`;
      $('coverage').append(row);
    }
  } catch (error) { showStatus(`Backend unavailable: ${error.message}`); }
}
window.addEventListener('pagehide', () => {
  capture.active = false;
  clearTimeout(capture.timer);
  capture.stream?.getTracks().forEach(track => track.stop());
  floating.destroy();
});
initialize();
