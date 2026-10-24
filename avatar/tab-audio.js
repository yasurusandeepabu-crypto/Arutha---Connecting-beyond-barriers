export class TabAudioCapture {
  constructor({ onResult, onStatus = () => {}, onState = () => {}, endpoint = '/api/audio', chunkMs = 4000, previewUnverified = false }) {
    Object.assign(this, { onResult, onStatus, onState, endpoint, chunkMs, previewUnverified });
    this.pending = [];
    this.sequence = 0;
    this.waiters = [];
  }

  async start({ source = 'tab' } = {}) {
    if (this.active || this.stopping) throw new Error('Capture is already active or finishing.');
    if (!navigator.mediaDevices || (source === 'tab' && !navigator.mediaDevices.getDisplayMedia)) throw new Error('Use desktop Chrome on localhost or HTTPS.');
    this.source = source;
    this.stream = source === 'microphone'
      ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (!this.stream.getAudioTracks().length) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      throw new Error('No tab audio shared. Choose the YouTube tab and enable “Share tab audio”.');
    }
    this.mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!this.mimeType) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      throw new Error('This browser cannot record WebM audio. Use desktop Chrome.');
    }
    this.audio = new MediaStream(this.stream.getAudioTracks());
    this.sessionId = crypto.randomUUID();
    this.sequence = 0;
    this.pending = [];
    this.active = true;
    this.stopping = false;
    this.stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stop(), { once: true });
    this.stream.getAudioTracks()[0]?.addEventListener('ended', () => this.stop(), { once: true });
    this.recordChunk();
    this.onState('capturing');
    this.onStatus(source === 'microphone' ? 'Listening to your microphone in 4-second chunks. Read the demo script slowly.' : 'Capturing shared tab audio in 4-second chunks.');
  }

  recordChunk() {
    if (!this.active) return;
    const parts = [];
    const started = performance.now();
    const recorder = new MediaRecorder(this.audio, { mimeType: this.mimeType });
    this.recorder = recorder;
    let resolveChunk;
    this.chunkDone = new Promise(resolve => { resolveChunk = resolve; });
    recorder.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    recorder.onstop = () => {
      clearTimeout(this.timer);
      const blob = new Blob(parts, { type: this.mimeType });
      if (blob.size && performance.now() - started > 200) {
        this.pending.push({ blob, sequence: this.sequence++, created: performance.now() });
        if (this.pending.length > 2) {
          this.pending.shift();
          this.onStatus('Speech processing is behind; skipped an old audio chunk.');
        }
      }
      if (this.active) this.recordChunk();
      this.pump();
      resolveChunk();
    };
    recorder.onerror = () => { this.onStatus('Audio recording failed. Share the tab again.'); this.stop(); };
    // Restarting creates a complete WebM file for every request.
    recorder.start();
    this.timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, this.chunkMs);
  }

  async pump() {
    if (this.sending) return;
    this.sending = true;
    try {
      while (this.pending.length) {
        const item = this.pending.shift();
        if (performance.now() - item.created > 15000) {
          this.onStatus('Skipped stale audio; some speech has no captions or signing.');
          continue;
        }
        try {
          const response = await fetch(this.endpoint, { method: 'POST', headers: {
            'Content-Type': this.mimeType, 'X-Session-Id': this.sessionId, 'X-Chunk-Sequence': String(item.sequence),
            'X-Preview-Unverified': this.previewUnverified ? '1' : '0',
          }, body: item.blob, signal: AbortSignal.timeout(60000) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Speech request failed.');
          this.onResult(result);
        } catch (error) { this.onStatus(`${error.message} This chunk was skipped; later chunks will continue.`); }
      }
    } finally {
      this.sending = false;
      for (const resolve of this.waiters.splice(0)) resolve();
    }
  }

  async stop() {
    if (this.stopping) return this.stopDone;
    if (!this.stream) return;
    this.stopping = true;
    let resolveStop;
    this.stopDone = new Promise(resolve => { resolveStop = resolve; });
    this.active = false;
    this.onState('stopping');
    clearTimeout(this.timer);
    this.onStatus('Finishing the last audio chunk…');
    if (this.recorder?.state === 'recording') this.recorder.stop();
    await this.chunkDone;
    this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;
    if (this.sending) await new Promise(resolve => this.waiters.push(resolve));
    try {
      const url = new URL('../api/interpret', new URL(this.endpoint, document.baseURI));
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '', session_id: this.sessionId, sequence: this.sequence++, flush: true, preview_unverified: this.previewUnverified }), signal: AbortSignal.timeout(5000) });
      if (response.ok) this.onResult(await response.json());
    } catch { this.onStatus('Stopped; the final incomplete phrase could not be flushed.'); }
    this.stopping = false;
    this.onStatus('Capture stopped.');
    this.onState('stopped');
    resolveStop();
  }
}
