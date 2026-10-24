const ENGINE = 'https://vhg.cmp.uea.ac.uk/tech/jas/vhg2026/';
let active = null, ready = false;
function send(type, extra = {}) { parent.postMessage({ source: 'arutha-cwasa', type, ...extra }, location.origin); }
const script = document.createElement('script');
script.src = `${ENGINE}cwa/allcsa.js`;
script.onerror = () => send('error', { message: 'Avatar engine unavailable. Check internet; captions remain available.' });
script.onload = async () => {
  try {
    CWASA.init({ jasBase: ENGINE, useClientConfig: false, useCwaConfig: false,
      sigmlBase: 'sigml', avJARBase: 'avatars', avJSONBase: 'avjson', useAvatarJARs: true,
      animgenFPS: 30, avs: ['anna'], animgenServer: null,
      avSettings: [{ width: 384, height: 320, avList: 'avs', initAv: 'anna', ambIdle: false,
        background: '#10283b', initCamera: [0,.23,3.24,5,18,30,-1,-1],
        initSpeed: 0, rateSpeed: 5, initSiGMLURL: null, allowSiGMLText: true }] });
    CWASA.addHook('avatarready', () => { ready = true; send('ready'); });
    CWASA.addHook('sigmlloaded', event => {
      if (!active) return;
      if (!event.msg?.s || !event.msg?.f) { send('failed', { id: active }); active = null; }
      else send('generated', { id: active, signs: event.msg.s, frames: event.msg.f });
    });
    CWASA.addHook('animidle', () => { if (active) { send('ended', { id: active }); active = null; } });
  } catch (error) { send('error', { message: error.message }); }
};
window.addEventListener('message', event => {
  // In PiP, the trusted controller runs in the parent window's opener.
  if ((event.source !== parent && event.source !== parent.opener) || event.origin !== location.origin || event.data?.source !== 'arutha-player') return;
  const data = event.data;
  if (data.type === 'stop') { active = null; window.CWASA?.stopSiGML(0); }
  if (data.type === 'play' && ready && typeof data.sigml === 'string' && data.sigml.length < 50000) {
    active = data.id;
    try { CWASA.playSiGMLText(data.sigml, 0); }
    catch { send('failed', { id: active }); active = null; }
  }
});
document.head.append(script);
