import { mountFloatingAvatar } from './player.js';

export function createFloatingAvatar({ onClose = () => {}, onStopCapture = () => {}, manifestUrl, brand = 'SignBridge', logoUrl, inlineParent } = {}) {
  const staging = inlineParent || document.createElement('div');
  staging.hidden = !inlineParent;
  if (!inlineParent) document.body.append(staging);
  const mounted = mountFloatingAvatar({ parent: staging, manifestUrl });
  mounted.element.classList.add('sb-material');
  const header = mounted.element.querySelector('header');
  const clear = header.querySelector('button');
  clear.textContent = 'Clear';
  clear.className = 'sb-action-secondary';
  header.querySelector('strong').innerHTML = '<span class="sb-brand-mark" aria-hidden="true">SB</span><span>SignBridge<span class="sb-brand-subtitle">Live interpreter</span></span>';
  header.querySelector('.sb-brand-mark').textContent = brand === 'SignBridge' ? 'SB' : brand.slice(0,2).toUpperCase();
  if (logoUrl) {
    const logo = document.createElement('img');
    logo.src = logoUrl; logo.alt = '';
    header.querySelector('.sb-brand-mark').replaceChildren(logo);
  }
  header.querySelector('strong > span:last-child').firstChild.textContent = brand;
  const language = document.createElement('span');
  language.className = 'sb-language-chip'; language.textContent = 'ASL · DEMO';
  header.append(language);
  const viewport = document.createElement('div');
  viewport.className = 'sb-viewport';
  viewport.append(mounted.element.querySelector('canvas'), mounted.element.querySelector('video'));
  header.after(viewport);
  const metadata = document.createElement('div');
  metadata.className = 'sb-metadata';
  const playback = document.createElement('div');
  const playbackLabel = document.createElement('span');
  playbackLabel.className = 'sb-field-label'; playbackLabel.textContent = 'Signing';
  playback.append(playbackLabel, mounted.player.status);
  const controls = document.createElement('div');
  controls.className = 'floating-controls';
  const state = document.createElement('span');
  state.className = 'sb-audio-state';
  state.setAttribute('role', 'status');
  state.textContent = 'Not listening';
  const audio = document.createElement('div');
  const audioLabel = document.createElement('span');
  audioLabel.className = 'sb-field-label'; audioLabel.textContent = 'Audio input';
  audio.append(audioLabel, state);
  metadata.append(playback, audio);
  viewport.after(metadata);
  const captionSection = document.createElement('section');
  captionSection.className = 'sb-caption-section';
  const captionLabel = document.createElement('span');
  captionLabel.className = 'sb-field-label'; captionLabel.textContent = 'Live captions · English';
  captionSection.append(captionLabel, mounted.player.caption);
  mounted.element.append(captionSection);
  const credits = document.createElement('p');
  credits.className = 'sb-credits';
  credits.innerHTML = '<a href="https://vh.cmp.uea.ac.uk/index.php/CWASA_Conditions_of_Use" target="_blank" rel="noopener">Avatar: UEA CWASA</a> · <a href="https://github.com/zhan-a/Kozha" target="_blank" rel="noopener">ASL data: Kozha · CC BY-NC</a>';
  mounted.element.append(credits);
  const stop = document.createElement('button');
  stop.type = 'button'; stop.textContent = 'Stop listening'; stop.disabled = true;
  stop.className = 'sb-action-primary';
  stop.onclick = onStopCapture;
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = 'Close'; close.className = 'sb-action-secondary';
  close.onclick = () => floatingWindow?.close();
  for (const [button, path] of [[stop, 'M6 6h12v12H6z'], [clear, 'M4 10a8 8 0 1 1 1 8M4 4v6h6'], [close, 'm6 6 12 12M18 6 6 18']]) {
    button.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`);
  }
  controls.append(stop, clear, close);
  mounted.element.append(controls);
  let floatingWindow, mode, lastCaption = '', disposed = false;

  const api = {
    get isOpen() { return !!floatingWindow && !floatingWindow.closed; },
    get mode() { return mode; },
    async open() {
      if (api.isOpen) { floatingWindow.focus(); return mode; }
      if (window.documentPictureInPicture?.requestWindow) {
        floatingWindow = await window.documentPictureInPicture.requestWindow({ width: 360, height: 620 });
        mode = 'always-on-top';
      } else {
        const shell = new URL('./floating-shell.html', import.meta.url).href;
        floatingWindow = window.open(shell, 'signbridge-floating-avatar', 'popup,width=360,height=620');
        if (!floatingWindow) throw new Error('Allow popups, then open the avatar again.');
        mode = 'regular-window';
        const deadline = performance.now() + 5000;
        while (!floatingWindow.closed && (floatingWindow.location.href !== shell || floatingWindow.document.readyState !== 'complete')) {
          if (performance.now() > deadline) { floatingWindow.close(); throw new Error('Avatar window could not finish loading. Please try again.'); }
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        if (floatingWindow.closed) throw new Error('The avatar window was closed before it opened.');
      }
      const target = floatingWindow;
      const doc = target.document;
      doc.body.replaceChildren();
      doc.title = 'SignBridge · live signs';
      doc.documentElement.lang = 'en';
      doc.documentElement.style.colorScheme = 'dark';
      doc.body.className = 'sb-floating-document';
      const stylesheet = doc.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = new URL('./player.css', import.meta.url).href;
      doc.head.append(stylesheet);
      mounted.element.style.cssText = '';
      doc.body.append(mounted.element);
      const previousVideo = mounted.player.video;
      previousVideo.pause();
      const video = doc.createElement('video');
      video.hidden = true; video.muted = true; video.playsInline = true;
      video.setAttribute('aria-label', 'Team recorded sign video');
      previousVideo.replaceWith(video);
      mounted.player.video = video;
      mounted.player.caption.textContent = lastCaption;
      mounted.player.ready.then(() => { if (floatingWindow === target && !target.closed) mounted.player.cwasa?.attach(); });
      if (inlineParent) inlineParent.dataset.floating = 'true';
      target.addEventListener('pagehide', () => {
        if (floatingWindow !== target) return;
        mounted.player.cwasa?.detach();
        staging.append(mounted.element);
        floatingWindow = null;
        mounted.player.stop();
        if (inlineParent) { inlineParent.dataset.floating = 'false'; mounted.player.cwasa?.attach(); }
        if (!disposed) onClose();
      }, { once: true });
      return mode;
    },
    enqueue(plan) {
      lastCaption = plan.text || lastCaption;
      if (api.isOpen || inlineParent) mounted.player.enqueue(plan);
    },
    stop() { mounted.player.stop(); },
    setCaptureState(value) {
      mounted.element.dataset.captureState = value;
      stop.disabled = value !== 'capturing';
      state.textContent = value === 'capturing' ? 'Listening to live audio' : value === 'stopping' ? 'Finishing audio…' : 'Not listening';
    },
    destroy() {
      disposed = true;
      floatingWindow?.close();
      mounted.destroy(); if (!inlineParent) staging.remove();
    },
  };
  return api;
}
