// Mathena. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Sidebar mic widget: mute / unmute (like a call), what the mic is doing, and a live input level

/* Mute really closes the mic: speech recognition stops and the audio stream is released, so Chrome's
   recording indicator goes away. Unmute reopens both. The level meter reads the same mic through
   getUserMedia; speech recognition itself has no level data. */
let micBlocked = false, mStream = null, mCtx = null, mAn = null, mRaf = 0, hearTimer = 0, mOpening = false;
const I_MIC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>';
const I_MIC_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-5.7-1.3M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11a6.5 6.5 0 0 1-.5 2.4M12 17.5V21M9 21h6M3 3l18 18"/></svg>';

async function micOpen() {
  if (mStream || mOpening || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return;
  mOpening = true;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (!micOn) { s.getTracks().forEach((t) => t.stop()); return; }   // muted while the prompt was open
    mStream = s; mCtx = new (window.AudioContext || window.webkitAudioContext)();
    mAn = mCtx.createAnalyser(); mAn.fftSize = 1024; mCtx.createMediaStreamSource(s).connect(mAn);
    if (mCtx.state === 'suspended') mCtx.resume().catch(() => {});
    $('micMeter').classList.remove('na'); meterLoop();
  } catch (e) { $('micMeter').classList.add('na'); }   // no level meter; recognition can still work
  finally { mOpening = false; }
}
function micClose() {
  cancelAnimationFrame(mRaf); mRaf = 0;
  if (mStream) mStream.getTracks().forEach((t) => t.stop());
  if (mCtx) mCtx.close().catch(() => {});
  mStream = mCtx = mAn = null; setMeter(0); micHearing(false);
}
const bars = () => $('micMeter').children;
function setMeter(lvl) { const b = bars(), n = Math.round(lvl * b.length); for (let i = 0; i < b.length; i++) b[i].classList.toggle('on', i < n); }
let smooth = 0;
function meterLoop() {
  if (!mAn) return;
  const d = new Float32Array(mAn.fftSize); mAn.getFloatTimeDomainData(d);
  let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
  const rms = Math.sqrt(sum / d.length), lvl = Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-8) + 60) / 50));   // -60 dB .. -10 dB
  smooth = lvl > smooth ? lvl : smooth * 0.85 + lvl * 0.15; setMeter(smooth);
  mRaf = requestAnimationFrame(meterLoop);
}
/* "Hearing you": speech recognition has detected speech (not just noise on the meter) */
function micHearing(on, pulse) {
  const h = $('micHear'); if (!h) return;
  clearTimeout(hearTimer);
  const set = (v) => { h.textContent = v ? 'Hearing speech' : 'No voice'; h.classList.toggle('on', v); };
  set(on && micOn);
  if (on && pulse) hearTimer = setTimeout(() => set(false), 1200);
}
function renderMic() {
  const btn = $('micToggle'); if (!btn) return;
  const muted = !micOn;
  btn.innerHTML = muted ? I_MIC_OFF : I_MIC; btn.setAttribute('aria-pressed', String(muted));
  btn.setAttribute('aria-label', muted ? 'Unmute microphone' : 'Mute microphone');
  btn.disabled = !SR;
  const S = !SR ? ['Voice unavailable', 'Use Chrome or Edge for voice. Typing still works.']
    : micBlocked ? ['Mic blocked', 'Allow the microphone in the address bar, then press unmute.']
    : muted ? ['Muted', 'Not listening. Press to unmute.']
    : ({ standby: ['Listening for commands', 'Say “Create new”, “Edit”, “Go to export” or “Tutorial”.'],
         equation: ['Dictating equation', 'Say “Done” when finished.'],
         change: ['Dictating an edit', 'Say “Done” to apply it.'],
         paused: ['Paused', 'Say “Resume” or a command.'],
         adder: ['Dictating a block', 'Say “Done” to add it, or “Cancel”.'],
         title: ['Dictating the title', 'Say “Done” when finished.'] })[vMode] || ['Listening', ''];
  $('micState').textContent = S[0]; $('micDetail').textContent = S[1];
  $('micw').className = 'micw' + (muted ? ' muted' : listening ? ' live' : '') + (micBlocked ? ' blocked' : '');
}
function toggleMute() {
  if (!SR) return;
  if (micOn) { runCmd('stop', false); $('announce').textContent = 'Microphone muted.'; return; }
  micOffByUser = false;
  if (startRec()) { setMode('standby'); setStatus('Mic is on. ' + HANDS_FREE); $('announce').textContent = 'Microphone on. ' + HANDS_FREE; }
}
$('micToggle').onclick = toggleMute;
document.addEventListener('keydown', (e) => { if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') { e.preventDefault(); toggleMute(); } });
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (mCtx && mCtx.state === 'suspended') mCtx.resume().catch(() => {}); }, true));
if (location.protocol === 'file:') $('micWarn').hidden = false;
renderMic();
