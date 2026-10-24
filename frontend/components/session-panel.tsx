'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, MonitorPlay, Play, Square, Trash2 } from 'lucide-react';
import { useCompanion } from './companion-provider';

const DEMO_TEXT = 'Hello, mother. Hello, father. Want help? Yes. Learn a name. Want a house? No. Eat. Good. Finish. Thank you.';
const SIGNS = ['HELLO', 'THANK-YOU', 'YES', 'NO', 'MOTHER', 'FATHER', 'EAT', 'GOOD', 'NAME', 'WANT', 'FINISH', 'HOUSE', 'LEARN', 'HELP'];

export function SessionPanel() {
  const session = useCompanion();
  const panel = useRef<HTMLElement>(null), captions = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(DEMO_TEXT);
  useEffect(() => { if (session.visible) panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [session.visible]);
  useEffect(() => { if (captions.current) captions.current.scrollTop = captions.current.scrollHeight; }, [session.caption]);
  const needsReview = session.result?.review_status === 'REVIEW_REQUIRED';
  return <section className="session-section dark-section" id="session" ref={panel} aria-label="Live signing session"><div className="container"><div className="session-card">
    <div className="session-heading"><div><p className="eyebrow">TRY THE WORKING PROTOTYPE</p><h2>See the avatar sign. Then try live audio.</h2></div><span className={`session-pill ${session.capturing ? 'is-live' : ''}`}>{session.capturing ? 'Live audio' : 'ASL · 14 signs'}</span></div>
    <p className="session-help">Unverified ASL word signs with English captions. This is a limited word-sign demo, not full ASL sentence translation.</p>
    <div className="session-demo-grid">
      <div className="session-demo-copy"><p className="eyebrow">1 · TRY THE AVATAR</p><h3>A short demo using all 14 signs</h3><blockquote className="session-script">{DEMO_TEXT}</blockquote>
        <button className="button button-blue" onClick={() => void session.test(DEMO_TEXT)} disabled={!session.runtimeReady || session.busy || session.capturing}><Play size={15}/>{session.busy ? 'Preparing…' : 'Play 14-sign text demo'}</button>
        <p className="session-help">Text playback tests the avatar and queue. It does not use the microphone or pretend to be live speech.</p>
        <div className="session-word-list" aria-label="Supported ASL signs">{SIGNS.map(sign => <span key={sign}>{sign}</span>)}</div>
        <p className="eyebrow session-live-label">2 · TRY REAL AUDIO</p><p className="session-help">Load the speech engine, then use your microphone and read the script slowly, pausing after each sentence. Or open the floating companion and share a video tab.</p>
    <div className="session-actions">
      {!session.speechReady && <button className="button button-dark" onClick={() => void session.prepare()} disabled={session.busy}>{session.busy ? 'Loading…' : 'Load speech engine'}</button>}
      <button className="button button-blue" onClick={() => void session.microphone()} disabled={!session.runtimeReady || !session.speechReady || session.capturing || session.busy}><Mic size={15}/>Use microphone</button>
      <button className="button button-blue" onClick={() => void session.open()} disabled={!session.runtimeReady}><MonitorPlay size={15}/>{session.opened ? 'Show companion' : 'Open companion'}</button>
      <button className="button button-blue" onClick={() => void session.share()} disabled={!session.speechReady || !session.opened || session.capturing || session.busy}><AudioLines size={15}/>Share tab audio</button>
      <button className="button button-dark" onClick={() => void session.stop()} disabled={!session.capturing}><Square size={13}/>Stop listening</button>
    </div>
      </div>
      <div className="session-avatar-column"><div id="inline-avatar" className="sb-floating-document sb-inline-host" aria-label="Live ASL avatar"><p className="session-avatar-loading">{session.opened ? 'The avatar is in your floating window. Close it to bring the avatar back here.' : 'Loading the 3D avatar. Internet is required.'}</p></div></div>
    </div>

    <p className="session-status" role="status">{session.status}</p>
    <p className="session-help">For tab audio, choose the video tab and enable <strong>Share tab audio</strong>. Keep this page open. Live speech has a processing delay; unsupported words remain in captions.</p>
    <div className="session-caption-head"><span>LIVE CAPTIONS · ENGLISH</span><button className="session-clear" onClick={session.clear}><Trash2 size={12}/>Clear</button></div>
    <div className="session-captions" ref={captions} aria-live="polite">{session.caption || <span>Your shared video’s words will appear here.</span>}</div>
    {session.result && <div className="session-token-list" aria-label="Queued ASL signs"><span>QUEUED SIGNS</span>{session.result.tokens.length ? session.result.tokens.map((token, index) => <b key={`${token.value}-${index}`}>{token.value}</b>) : <em>{session.result.pending ? 'Waiting for the rest of the sentence…' : 'No supported signs in this result.'}</em>}</div>}
    {session.result?.unsupported && <p className="session-help">Caption only: {session.result.unsupported}</p>}
    {session.result && <p className="session-review">{session.result.preview_only ? 'Unverified ASL word signs in English order. This is not a sentence translation. Keep captions visible.' : needsReview ? 'Some signing needs review or a supplied clip. Captions remain available.' : session.result.pending ? 'Waiting for the rest of the sentence.' : 'Translation checks completed.'}</p>}
    <details className="session-tools"><summary>Team tools &amp; translation checks</summary>
      <div className="session-tool-links"><a href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/capture.html`}>Capture sign movements ↗</a><a href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/record.html`}>Record a clip ↗</a><a href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/live.html`}>Standalone launcher ↗</a></div>
      <p className="session-help">ASL demo: HELLO, THANK-YOU, YES, NO, MOTHER, FATHER, EAT, GOOD, NAME, WANT, FINISH, HOUSE, LEARN, HELP. All signs require Deaf-native review. Unsupported words remain in captions. The ASL preview is always labelled unverified.</p>
      {session.result && <><ul>{session.result.flags?.map((flag, index) => <li key={`${flag.kind}-${index}`}>{flag.kind}: {flag.note}</li>)}</ul><pre>{JSON.stringify({frames:session.result.frames,timeline:session.result.timeline,review_status:session.result.review_status,stt_ms:session.result.stt_ms,gloss_ms:session.result.gloss_ms},null,2)}</pre></>}
      <form onSubmit={event => { event.preventDefault(); void session.test(text); }}><label htmlFor="session-text">No-key text test</label><textarea id="session-text" value={text} maxLength={2000} onChange={event => setText(event.target.value)} required/><button className="button button-blue" disabled={!session.runtimeReady || session.busy || session.capturing}>Interpret text</button></form>
    </details>
  </div></div></section>;
}
