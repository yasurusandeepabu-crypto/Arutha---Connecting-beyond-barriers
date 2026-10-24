export class CWASAPlayer {
  constructor({ canvas, status }) {
    this.canvas = canvas;
    this.status = status;
    this.onMessage = event => {
      if (event.source !== this.iframe?.contentWindow || event.origin !== location.origin || event.data?.source !== 'arutha-cwasa') return;
      const data = event.data;
      if (data.type === 'ready') { this.loaded = true; this.resolveReady?.(true); this.status.textContent = 'ASL avatar ready · 14 unverified signs'; }
      if (data.type === 'error') { this.status.textContent = data.message; this.resolveReady?.(false); this.finish?.(false); }
      if (data.id === this.activeId && ['ended', 'failed'].includes(data.type)) this.finish?.(data.type === 'ended');
    };
  }

  attach() {
    const doc = this.canvas.ownerDocument;
    if (this.iframe?.ownerDocument === doc && this.iframe.isConnected) return;
    this.stop(); this.iframe?.remove();
    this.view?.removeEventListener('message', this.onMessage);
    this.view = doc.defaultView;
    this.view.addEventListener('message', this.onMessage);
    const frame = doc.createElement('iframe');
    frame.title = 'Unverified ASL signing avatar · CWASA Anna';
    frame.className = 'sb-cwasa';
    frame.src = new URL('./cwasa-frame.html', import.meta.url).href;
    this.loaded = false;
    this.ready = new Promise(resolve => {
      this.resolveReady = result => { clearTimeout(this.readyTimer); resolve(result); };
      this.readyTimer = setTimeout(() => { this.status.textContent = 'Avatar unavailable. Check internet; captions remain available.'; resolve(false); }, 60000);
    });
    this.iframe = frame;
    this.canvas.after(frame);
    this.canvas.hidden = true;
    this.status.textContent = 'Loading ASL avatar · internet required…';
  }

  async play(sigml) {
    this.attach();
    const serial = this.serial;
    if (!await this.ready) return false;
    if (serial !== this.serial) return false;
    return new Promise(resolve => {
      this.activeId = crypto.randomUUID();
      const timer = setTimeout(() => { this.send('stop'); this.finish?.(false); }, 20000);
      this.finish = success => { clearTimeout(timer); this.finish = null; resolve(success); };
      this.send('play', { id: this.activeId, sigml });
    });
  }

  send(type, extra = {}) { this.iframe?.contentWindow?.postMessage({ source: 'arutha-player', type, ...extra }, location.origin); }
  stop() { this.serial = (this.serial || 0) + 1; this.send('stop'); this.finish?.(false); }
  detach() { this.stop(); clearTimeout(this.readyTimer); this.resolveReady?.(false); this.view?.removeEventListener('message', this.onMessage); this.iframe?.remove(); this.iframe = null; }
  destroy() { this.detach(); }
}
