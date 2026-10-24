'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Plan = {
  text: string; tokens: { type: string; value: string }[]; flags?: { kind: string; note: string }[];
  review_status?: string; preview_only?: boolean; pending?: string; unsupported?: string;
  frames?: unknown[]; timeline?: unknown; stt_ms?: number; gloss_ms?: number;
};
type Capture = { start(options?: {source: string}): Promise<void>; stop(): Promise<void>; previewUnverified: boolean; stream?: MediaStream };
type Floating = { open(): Promise<string>; enqueue(plan: Plan): void; stop(): void; destroy(): void; setCaptureState(state: string): void; readonly isOpen: boolean };
type Companion = {
  visible: boolean; runtimeReady: boolean; speechReady: boolean; opened: boolean; capturing: boolean; busy: boolean;
  status: string; mode: string; caption: string; result: Plan | null; preview: boolean;
  open(): Promise<void>; prepare(): Promise<void>; share(): Promise<void>; microphone(): Promise<void>; stop(): Promise<void>; clear(): void;
  setPreview(value: boolean): void; test(text: string): Promise<void>;
};
const Context = createContext<Companion | null>(null);
const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const api = (path: string) => `${base.replace(/\/$/, '')}${path}`;

async function request(path: string, body?: unknown, timeout = 20000) {
  const response = await fetch(api(path), {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The local service could not complete this request.');
  return data;
}

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false), [runtimeReady, setRuntimeReady] = useState(false);
  const [speechReady, setSpeechReady] = useState(false), [opened, setOpened] = useState(false);
  const [capturing, setCapturing] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Checking the local speech service…'), [mode, setMode] = useState('');
  const [caption, setCaption] = useState(''), [result, setResult] = useState<Plan | null>(null), [preview, setPreview] = useState(false);
  const floating = useRef<Floating | null>(null), capture = useRef<Capture | null>(null), history = useRef<string[]>([]);
  const receive = useCallback((plan: Plan) => {
    if (plan.text) history.current = [...history.current, plan.text].slice(-40);
    const text = history.current.join(' ');
    setCaption(text); setResult(plan);
    floating.current?.enqueue({ ...plan, text });
  }, []);

  const open = useCallback(async () => {
    setVisible(true);
    if (!floating.current) { setStatus('The companion is loading. Please try opening it again in a moment.'); return; }
    try {
      const kind = await floating.current.open();
      setMode(kind); setOpened(true);
      setStatus(kind === 'always-on-top' ? 'Companion open. Share your video tab to begin.' : 'Companion open in a regular window. Use desktop Chrome for always-on-top mode.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to open the companion.'); }
  }, []);

  useEffect(() => {
    let disposed = false;
    let localCapture: Capture | undefined, localFloating: Floating | undefined;
    async function initialize() {
      try {
        const floatingPath = '/runtime/floating-window.js', capturePath = '/runtime/tab-audio.js';
        const [windowModule, audioModule] = await Promise.all([
          import(/* webpackIgnore: true */ floatingPath), import(/* webpackIgnore: true */ capturePath),
        ]);
        if (disposed) return;
        localFloating = windowModule.createFloatingAvatar({
          brand: 'SignBridge',
          logoUrl: new URL('/images/signbridge.jpeg', location.href).href,
          inlineParent: document.getElementById('inline-avatar'),
          manifestUrl: new URL(api('/signs/manifest.json'), location.href).href,
          onClose() { if (!disposed) { setOpened(false); void localCapture?.stop(); } },
          onStopCapture() { void localCapture?.stop(); },
        });
        localCapture = new audioModule.TabAudioCapture({ endpoint: api('/api/audio'),
          onResult(plan: Plan) { if (!disposed) receive(plan); },
          onStatus(message: string) { if (!disposed) setStatus(message); },
          onState(state: string) { if (!disposed) { setCapturing(state !== 'stopped'); localFloating?.setCaptureState(state); } },
        });
        floating.current = localFloating || null; capture.current = localCapture || null;
        setRuntimeReady(true);
        const health = await request('/api/health');
        if (!disposed) {
          setSpeechReady(health.speech.ready);
          setStatus(health.speech.ready ? 'Speech engine ready. Open your companion to get started.' : 'Open the companion, then load the local speech engine.');
        }
      } catch (error) { if (!disposed) setStatus(`Local service unavailable. ${error instanceof Error ? error.message : ''}`); }
    }
    void initialize();
    const handleOpen = () => { void open(); };
    const release = () => localCapture?.stream?.getTracks().forEach(track => track.stop());
    window.addEventListener('open-companion', handleOpen); window.addEventListener('pagehide', release);
    return () => {
      disposed = true;
      window.removeEventListener('open-companion', handleOpen); window.removeEventListener('pagehide', release);
      void localCapture?.stop(); localFloating?.destroy();
      if (capture.current === localCapture) capture.current = null;
      if (floating.current === localFloating) floating.current = null;
    };
  }, [open, receive]);

  async function prepare() {
    setBusy(true); setStatus('Loading the local speech engine. The first run may download model weights…');
    try { const data = await request('/api/prepare', {}, 180000); setSpeechReady(data.ready); setStatus('Speech engine ready. Choose your video tab and enable Share tab audio.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Speech engine unavailable.'); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!capture.current || !floating.current?.isOpen || !speechReady || capturing) return;
    setBusy(true);
    try { capture.current.previewUnverified = preview; await capture.current.start(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Tab audio sharing failed.'); }
    finally { setBusy(false); }
  }
  async function stop() { await capture.current?.stop(); }
  async function microphone() {
    if (!capture.current || !speechReady || capturing) return;
    setBusy(true);
    try { await capture.current.start({source: 'microphone'}); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Microphone access failed.'); }
    finally { setBusy(false); }
  }
  function clear() { history.current = []; setCaption(''); setResult(null); floating.current?.stop(); }
  async function test(text: string) {
    if (capturing) return;
    clear();
    setBusy(true);
    try { receive(await request('/api/translate', { text, preview_unverified: preview })); setStatus('Text demo queued. This playback does not use speech recognition.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Text analysis failed.'); }
    finally { setBusy(false); }
  }
  return <Context.Provider value={{ visible, runtimeReady, speechReady, opened, capturing, busy, status, mode, caption, result, preview, open, prepare, share, microphone, stop, clear, setPreview, test }}>{children}</Context.Provider>;
}

export function useCompanion() {
  const context = useContext(Context);
  if (!context) throw new Error('CompanionProvider is required.');
  return context;
}
