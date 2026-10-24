const REST = { pose: [[0, -.65], [-.5, 0], [.5, 0], [-.68, .7], [.68, .7], [-.4, 1.3], [.4, 1.3]], lh: null, rh: null };
const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function validMotion(data) {
  const points = (p, n) => Array.isArray(p) && p.length === n && p.every(v => Array.isArray(v) && v.length === 2 && v.every(x => Number.isFinite(x) && Math.abs(x) < 20));
  return data && Number.isFinite(data.fps) && data.fps >= 1 && data.fps <= 120 &&
    Array.isArray(data.frames) && data.frames.length > 0 && data.frames.length <= 3600 &&
    data.frames.every(f => points(f.pose, 7) && (f.lh === null || points(f.lh, 21)) && (f.rh === null || points(f.rh, 21)));
}

export function blend(a, b, t) {
  const mix = (x, y) => x && y ? x.map((p, i) => p.map((v, j) => v + (y[i][j] - v) * t)) : (t < .5 ? x : y);
  return { pose: mix(a.pose, b.pose), lh: mix(a.lh, b.lh), rh: mix(a.rh, b.rh) };
}

export class SignBridgePlayer {
  constructor({ canvas, video, status, caption, manifestUrl = new URL('./signs/manifest.json', import.meta.url) }) {
    Object.assign(this, { canvas, video, status, caption });
    this.queue = [];
    this.generation = 0;
    this.frame = REST;
    this.cache = new Map();
    this.manifestUrl = new URL(manifestUrl, document.baseURI);
    this.ready = fetch(this.manifestUrl).then(r => {
      if (!r.ok) throw new Error('Cannot load sign manifest');
      return r.json();
    }).then(async m => {
      this.manifest = m;
      let localWarning = '';
      try {
        const { listMotions } = await import('./library.js');
        for (const clip of m.renderer === 'cwasa' ? [] : await listMotions()) {
          const group = clip.type === 'letter' ? 'letters' : 'signs';
          this.manifest[group] ||= {};
          this.manifest[group][clip.motion.gloss] = { motionData: clip.motion };
        }
      } catch { localWarning = ' · browser storage unavailable'; }
      if (m.renderer === 'cwasa') {
        const { CWASAPlayer } = await import('./cwasa-player.js');
        this.cwasa = new CWASAPlayer(this);
        if (this.canvas.closest('.sb-floating-document') || !this.canvas.closest('[hidden]')) this.cwasa.attach();
        if (this.reviewBadge) { this.reviewBadge.hidden = false; this.reviewBadge.textContent = 'ASL word-sign preview · not signer-reviewed'; }
      }
      this.status.textContent = `Ready · ${Object.keys(m.signs || {}).length} ${m.renderer === 'cwasa' ? 'unverified ASL' : 'recorded'} signs${localWarning}`;
    }).catch(e => {
      this.manifest = { signs: {}, letters: {} };
      this.status.textContent = e.message;
    });
    this.draw(REST);
  }

  enqueue({ text = '', tokens = [], preview_only = false }) {
    this.caption.textContent = text;
    this.caption.scrollTop = this.caption.scrollHeight;
    if (preview_only && this.reviewBadge) {
      this.reviewBadge.hidden = false;
      this.reviewBadge.textContent = `${this.manifest?.language_code || 'SLSL'} word-sign preview · not signer-reviewed`;
    }
    const clean = tokens.slice(0, 25).filter(t => t && ['sign', 'spell', 'clip'].includes(t.type) && typeof t.value === 'string');
    if (this.queue.length + clean.length > 50) {
      this.status.textContent = 'Playback backlog: new signs skipped; captions still update.';
      return;
    }
    this.queue.push(...clean);
    if (!this.running) this.drain();
  }

  stop() {
    this.generation++;
    this.cwasa?.stop();
    this.cancelAnimation?.();
    this.queue.length = 0;
    this.video.pause();
    this.video.hidden = true;
    this.canvas.hidden = !!this.cwasa;
    this.draw(REST);
    this.status.textContent = 'Stopped';
    if (this.reviewBadge) this.reviewBadge.hidden = !this.cwasa;
  }

  async drain() {
    this.running = true;
    await this.ready;
    try {
      while (this.queue.length) {
        const token = this.queue.shift();
        const generation = this.generation;
        if (token.type === 'clip') {
          if (!await this.playAsset(this.manifest.phrases?.[token.value], token.value, generation) && generation === this.generation) {
            this.status.textContent = `${token.value} — no SLSL clip supplied yet`;
            await pause(500);
          }
        } else if (token.type === 'sign') {
          if (!await this.playAsset(this.manifest.signs?.[token.value], token.value, generation) && generation === this.generation) {
            if (this.cwasa) this.status.textContent = `${token.value} · animation unavailable; captions retained`;
            else await this.spell(token.value, generation);
          }
        } else await this.spell(token.value, generation);
      }
    } finally {
      this.running = false;
      if (this.queue.length) this.drain();
    }
  }

  async spell(word, generation) {
    const letters = word.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 32);
    for (const letter of letters) {
      if (generation !== this.generation) return;
      if (!await this.playAsset(this.manifest.letters?.[letter], `${word} · ${letter}`, generation)) {
        if (generation !== this.generation) return;
        this.draw(REST);
        this.status.textContent = `${word} · ${letter} — text only: no recorded letter`;
        await pause(350);
      }
    }
  }

  async playAsset(asset, label, generation) {
    if (!asset || generation !== this.generation) return false;
    this.status.textContent = label;
    if (asset.sigml && this.cwasa) {
      try {
        const url = new URL(asset.sigml, this.manifestUrl);
        if (!this.cache.has(url.href)) {
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error('Missing SiGML');
          this.cache.set(url.href, await response.text());
        }
        if (generation !== this.generation) return false;
        const played = await this.cwasa.play(this.cache.get(url.href));
        if (generation === this.generation && played) this.status.textContent = `${label} · ASL preview`;
        return played;
      } catch { return false; }
    }
    if (asset.motion || asset.motionData) {
      try {
        let motion = asset.motionData;
        if (!motion) {
          const url = new URL(asset.motion, this.manifestUrl);
          if (!this.cache.has(url.href)) {
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error('Missing motion');
            const data = await response.json();
            if (!validMotion(data)) throw new Error('Invalid motion');
            this.cache.set(url.href, data);
          }
          motion = this.cache.get(url.href);
        }
        if (!validMotion(motion)) throw new Error('Invalid motion');
        if (generation !== this.generation) return false;
        const previous = this.frame;
        await this.animate(180, t => blend(previous, motion.frames[0], t), generation);
        await this.animate(motion.frames.length / motion.fps * 1000, t => {
          const position = t * (motion.frames.length - 1);
          const i = Math.floor(position);
          return blend(motion.frames[i], motion.frames[Math.min(i + 1, motion.frames.length - 1)], position - i);
        }, generation);
        const last = this.frame;
        await this.animate(150, t => blend(last, REST, t), generation);
        return true;
      } catch {
        if (generation === this.generation) this.status.textContent = `${label} · motion unavailable`;
      }
    }
    if (asset.video && generation === this.generation) {
      const url = new URL(asset.video, this.manifestUrl);
      this.video.muted = true;
      this.video.src = url.href;
      this.video.hidden = false;
      this.canvas.hidden = true;
      let timeout;
      try {
        await new Promise((resolve, reject) => {
          const check = () => {
            if (generation !== this.generation) resolve();
            else timeout = setTimeout(check, 100);
          };
          const limit = setTimeout(() => reject(new Error('Video timeout')), 15000);
          this.video.onended = () => { clearTimeout(limit); resolve(); };
          this.video.onerror = () => { clearTimeout(limit); reject(new Error('Video unavailable')); };
          this.video.play().catch(e => { clearTimeout(limit); reject(e); });
          check();
          // Cleared in finally even if playback fails.
          this.video._limit = limit;
        });
        return true;
      } catch { return false; }
      finally {
        clearTimeout(timeout);
        clearTimeout(this.video._limit);
        this.video.pause();
        this.video.onended = this.video.onerror = null;
        this.video.hidden = true;
        this.canvas.hidden = false;
      }
    }
    return false;
  }

  animate(duration, getFrame, generation) {
    if (generation !== this.generation) return Promise.resolve();
    const view = this.canvas.ownerDocument.defaultView;
    const start = view.performance.now();
    return new Promise(resolve => {
      let frameId;
      const finish = () => {
        if (this.cancelAnimation === cancel) this.cancelAnimation = null;
        resolve();
      };
      const cancel = () => { view.cancelAnimationFrame(frameId); finish(); };
      this.cancelAnimation = cancel;
      const tick = () => {
        if (generation !== this.generation) return finish();
        const t = Math.min(1, (view.performance.now() - start) / duration);
        this.draw(getFrame(t));
        if (t < 1) frameId = view.requestAnimationFrame(tick); else finish();
      };
      frameId = view.requestAnimationFrame(tick);
    });
  }

  draw(frame) {
    this.frame = frame;
    const ctx = this.canvas.getContext('2d');
    const { width: w, height: h } = this.canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#10283b';
    ctx.fillRect(0, 0, w, h);
    const xy = p => [w / 2 + p[0] * w * .28, h * .4 + p[1] * w * .28];
    const line = (a, b, color, width) => {
      ctx.beginPath(); ctx.moveTo(...xy(a)); ctx.lineTo(...xy(b));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
    };
    const p = frame.pose;
    const hip = [[p[1][0] * .8, 1.65], [p[2][0] * .8, 1.65]];
    ctx.beginPath(); [p[1], p[2], hip[1], hip[0]].forEach((v, i) => i ? ctx.lineTo(...xy(v)) : ctx.moveTo(...xy(v)));
    ctx.closePath(); ctx.fillStyle = '#3386a1'; ctx.fill();
    for (const [a,b] of [[1,3],[3,5],[2,4],[4,6]]) line(p[a], p[b], '#ffcfaa', 15);
    const head = xy(p[0]);
    ctx.beginPath(); ctx.ellipse(head[0], head[1], 26, 33, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffcfaa'; ctx.fill();
    ctx.fillStyle = '#10283b';
    for (const dx of [-9, 9]) { ctx.beginPath(); ctx.arc(head[0] + dx, head[1] - 4, 3, 0, Math.PI * 2); ctx.fill(); }
    for (const hand of [frame.lh, frame.rh]) if (hand) {
      for (const [a, b] of BONES) line(hand[a], hand[b], '#ffe6d2', 3);
      for (const point of hand) { ctx.beginPath(); ctx.arc(...xy(point), 2.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
  }
}

export function mountFloatingAvatar({ parent = document.body, manifestUrl } = {}) {
  const panel = document.createElement('section');
  panel.className = 'signbridge-float';
  panel.setAttribute('aria-label', 'SignBridge sign playback');
  panel.innerHTML = `<header><strong>SignBridge</strong><button type="button" aria-label="Stop playback">Stop</button></header><p class="sb-review" hidden role="status"></p><canvas width="420" height="440" role="img" aria-label="Recorded sign motion avatar"></canvas><video hidden muted playsinline aria-label="Team recorded sign video"></video><p class="sb-status" role="status" aria-live="polite">Loading recordings…</p><p class="sb-caption" aria-live="polite"></p>`;
  parent.append(panel);
  const player = new SignBridgePlayer({ canvas: panel.querySelector('canvas'), video: panel.querySelector('video'), status: panel.querySelector('.sb-status'), caption: panel.querySelector('.sb-caption'), manifestUrl });
  player.reviewBadge = panel.querySelector('.sb-review');
  panel.querySelector('button').onclick = () => player.stop();
  const header = panel.querySelector('header');
  let drag;
  header.onpointerdown = e => {
    if (panel.ownerDocument !== document) return;
    if (e.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    header.setPointerCapture(e.pointerId);
  };
  header.onpointermove = e => {
    if (!drag) return;
    panel.style.right = panel.style.bottom = 'auto';
    panel.style.left = `${Math.max(0, Math.min(innerWidth - panel.offsetWidth, e.clientX - drag.x))}px`;
    panel.style.top = `${Math.max(0, Math.min(innerHeight - 50, e.clientY - drag.y))}px`;
  };
  header.onpointerup = header.onpointercancel = () => { drag = null; };
  return { player, element: panel, destroy: () => { player.stop(); player.cwasa?.destroy(); panel.remove(); } };
}

export function openAvatarWindow() {
  const target = new URL('./window.html', import.meta.url);
  const popup = window.open(target, 'signbridge-avatar', 'popup,width=380,height=650');
  if (!popup) throw new Error('Allow popups to open the avatar window.');
  let ready = false;
  const pending = [];
  const listener = e => {
    if (e.source !== popup || e.origin !== target.origin || e.data?.type !== 'signbridge-ready') return;
    ready = true;
    for (const plan of pending.splice(0)) popup.postMessage({ type: 'signbridge-plan', plan }, target.origin);
  };
  window.addEventListener('message', listener);
  return {
    enqueue(plan) {
      if (popup.closed) throw new Error('Avatar window is closed.');
      if (ready) popup.postMessage({ type: 'signbridge-plan', plan }, target.origin);
      else { pending.push(plan); if (pending.length > 5) pending.shift(); }
    },
    stop() { if (!popup.closed) popup.postMessage({ type: 'signbridge-stop' }, target.origin); },
    close() { window.removeEventListener('message', listener); popup.close(); },
  };
}
