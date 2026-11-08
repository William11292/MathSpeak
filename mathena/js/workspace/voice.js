// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: one mic for dictation and voice commands

/* ---------- Voice control: one mic for dictation and commands ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, micOn = false, vMode = 'off', vBusy = false, base = '';   // vMode: off | equation | change | paused
let listening = false;  // true while words are being added to a box
const CMDS = [['stop listening', 'stop'], ['turn off the mic', 'stop'], ['start listening', 'start'], ['resume', 'start'], ['select that', 'selthat'],
  ['refine with ai', 'ai'], ['refine with a i', 'ai'], ['refine with a.i.', 'ai'], ['refine manually', 'manual'], ['say a change', 'change'], ['make a change', 'change'],
  ['out a layer', 'out'], ['in a layer', 'in'], ['go out', 'out'], ['go in', 'in'], ['out', 'out'], ['in', 'in'],
  ['previous', 'left'], ['left', 'left'], ['back', 'left'], ['next', 'right'], ['right', 'right'],
  ['pause', 'pause'], ['done', 'done'], ['stop', 'done'], ['clear', 'clear'], ['delete', 'del'], ['delete that', 'del'], ['save', 'save'], ['save that', 'save'], ['save it', 'save']];
const TRAIL = ['stop listening', 'pause', 'done', 'stop', 'clear', 'save'];   // commands also caught at the end of dictated words
const norm = (t) => t.toLowerCase().replace(/[,!?;:]/g, ' ').replace(/\.(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
function parseChunk(t) {
  const n = norm(t); const whole = CMDS.find((c) => c[0] === n);
  if (whole) return { text: '', cmd: whole[1] };
  for (const p of TRAIL) if (n.endsWith(' ' + p)) {
    const words = t.trim().split(/\s+/); return { text: words.slice(0, words.length - p.split(' ').length).join(' '), cmd: CMDS.find((c) => c[0] === p)[1] };
  }
  return { text: t, cmd: null };
}
const targetBox = () => (vMode === 'change' ? wsInput : spoken);
function addWords(text) {
  const box = targetBox(); base = (base ? base + ' ' : '') + text.trim(); box.value = base;
}
function startRec() {
  if (!SR) { setStatus('Voice control needs Chrome or Edge. Type instead.', 'err'); return false; }
  if (micOn) return true;
  rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) handleFinal(t); else interim += t;
    }
    if (listening && interim) targetBox().value = (base ? base + ' ' : '') + interim.trim();
  };
  rec.onerror = (ev) => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return;
    const blocked = ev.error === 'not-allowed' || ev.error === 'service-not-allowed';
    setStatus(blocked ? 'The microphone is blocked in this view. Open the page as a standalone file in Chrome, or type instead.' : 'Voice control stopped: ' + ev.error, 'err');
    if (blocked) { micOn = false; setMode('off'); }
  };
  rec.onend = () => { if (micOn) { try { rec.start(); } catch (e) { micOn = false; setMode('off'); } } };   // Chrome stops after silence; keep going
  try { rec.start(); micOn = true; return true; } catch (e) { setStatus('Couldn\'t start the mic: ' + e.message, 'err'); return false; }
}
function stopRec() { micOn = false; try { rec && rec.stop(); } catch (e) {} setMode('off'); }
function handleFinal(t) {
  const { text, cmd } = parseChunk(t);
  if (text.trim()) {
    if (listening) addWords(text);
    else if (!cmd) setStatus('“' + text.trim() + '” isn\'t a command. Say “Start listening” to dictate, or “Say a change”.', 'err');
  }
  if (cmd) runCmd(cmd, true);
}
function setMode(m) {
  vMode = m; listening = m === 'equation' || m === 'change';
  spoken.classList.toggle('target', m === 'equation'); wsInput.classList.toggle('target', m === 'change');
  const M = { off: 'Mic off', equation: 'Listening · equation', change: 'Listening · change', paused: 'Paused · commands only' };
  $('vModeText').textContent = M[m]; $('vMode').className = 'mode' + (listening ? ' live' : m === 'paused' ? ' paused' : '');
  updateBar();
}
const manualOpen = () => !latexEl.hidden;
function setManual(on) {
  latexEl.hidden = !on; latexView.hidden = on;
  $('vManual').textContent = on ? '“Done editing”' : '“Refine manually”'; $('vManual').setAttribute('aria-pressed', String(on));
  if (on) { latexEl.value = current.latex; latexEl.focus(); setStatus('Editing the LaTeX by hand. Say or press “Done” when finished.'); }
  else { latexView.focus({ preventScroll: true }); }
  updateBar();
}
function updateBar() {
  const has = !!L, box = targetBox();
  const B = (c) => document.querySelector('.cmdbar [data-cmd="' + c + '"]');
  $('vStartText').textContent = listening ? '“Stop listening”' : vMode === 'paused' ? '“Resume”' : '“Start listening”';
  $('vStart').classList.toggle('on', listening); $('vStart').setAttribute('aria-pressed', String(micOn));
  B('pause').disabled = !listening;
  B('done').disabled = vBusy || !(manualOpen() || box.value.trim() || (vMode === 'change' && has));
  B('clear').disabled = !box.value.trim();
  B('selthat').disabled = !has; B('del').disabled = !has;
  B('change').disabled = !has; B('save').disabled = vBusy || !current.latex.trim() || savedLatex === current.latex; $('vSave').textContent = current.latex.trim() && savedLatex === current.latex ? '✓ Saved' : '“Save”'; B('ai').disabled = vBusy || !has; B('manual').disabled = !current.latex.trim() && !manualOpen();
}
function runCmd(c, byVoice) {
  switch (c) {
    case 'start':
      if (listening && !byVoice) { stopRec(); setStatus('Mic off.'); return; }
      if (!startRec()) return;
      if (vMode === 'paused' && base) { setMode(lastTarget); setStatus('Listening again. New words are added to the end.'); return; }
      base = ''; spoken.value = ''; current.source = 'voice'; lastTarget = 'equation'; setMode('equation');
      setStatus('Listening for the equation. Say “Done” when finished.'); return;
    case 'stop': stopRec(); setStatus('Mic off.'); return;
    case 'pause':
      if (!listening) return; lastTarget = vMode; setMode('paused');
      setStatus('Paused. Words are no longer added. Say “Resume”, a command, or “Done”.'); return;
    case 'done':
      if (manualOpen()) { setManual(false); setStatus('LaTeX updated.', 'ok'); return; }
      { const wasChange = vMode === 'change' || (vMode === 'paused' && lastTarget === 'change');
        base = ''; if (micOn) setMode('paused'); else setMode('off');
        if (wasChange) refineAI(); else convert(); }
      return;
    case 'clear': { const box = targetBox(); box.value = ''; base = ''; setStatus('Cleared.'); updateBar(); return; }
    case 'selthat': selectThat(); return;
    case 'del': deleteLayer(); return;
    case 'out': move('ArrowUp'); return;
    case 'in': move('ArrowDown'); return;
    case 'left': move('ArrowLeft'); return;
    case 'right': move('ArrowRight'); return;
    case 'change':
      if (!L) return;
      if (byVoice || micOn) { if (!startRec()) return; base = ''; wsInput.value = ''; lastTarget = 'change'; setMode('change');
        setStatus('Say the change for ' + scopeInfo().name + '. Then say “Refine with AI” or “Done”.'); }
      else { wsInput.focus(); setStatus('Type the change for ' + scopeInfo().name + ', then press “Refine with AI”.'); }
      return;
    case 'ai': if (listening) { base = ''; setMode(micOn ? 'paused' : 'off'); } refineAI(); return;
    case 'manual': setManual(!manualOpen()); return;
    case 'save': if (listening) { base = ''; setMode(micOn ? 'paused' : 'off'); } saveEquation(); return;
  }
}
let lastTarget = 'equation';
document.querySelectorAll('.cmdbar [data-cmd]').forEach((b) => b.onclick = () => runCmd(b.dataset.cmd, false));
[spoken, wsInput].forEach((t) => t.addEventListener('input', updateBar));
if (!SR) { $('vStart').disabled = true; $('vStartText').textContent = 'Voice needs Chrome or Edge'; }
