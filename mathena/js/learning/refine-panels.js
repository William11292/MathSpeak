// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// MathSpeak Help: the Practice mic ("Say it") and "Fix it" (changing the student's own equation), plus the
// "Change an element" / "Refine with AI" instruction boxes. practice.js owns the attempt and calls render().
//
// Everything works the way the Math Workspace does, so what students practice is what they'll use:
//   - One mic. "Say it" (or the workspace's "Create new") listens for the phrase; "Done" checks it. The mic then stays
//     on for commands: "Start edit" / "In a layer" / "Next" / "Select that" / "Delete" / "Say a change" → "Done" fix it.
//   - Voice commands come from the workspace's own command list (ENTRY / CMDS / TRAIL in js/workspace/voice.js), so a
//     phrase added or changed there works here too. The fallback list below is used only if that file isn't loaded.
//   - Select that, Delete, moving, Say a change → Refine with AI, and Refine manually behave and word their messages like
//     js/workspace/commands.js. Refine with AI sends the same prompt and applies one result. (.lz-test/compare-william.js
//     runs William's functions next to these and reports any difference.)
// render(hosts, ctx): hosts { voiceBtn, voice, edit }. ctx: latex (the student's equation, or null before they say anything),
//   layers, fresh, canUndo, hasPhrase, edit(latex, message), undo(), speakText(latex), announce(text), onPhrase(text), eq().
// renderInfo(host) draws the two instruction boxes.

const LZ_REFINE = (() => {
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const claudeReady = () => { try { return !!sample; } catch (e) { return false; } };   // `sample` is set in state.js / api-key.js
  const cmd = (t) => '<span class="lz-cmd">“' + t + '”</span>';
  const MIC = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>';
  const STOP = '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11"/></svg>';

  let hosts = {}, ctx = null, L = null, selId = null, forLatex = null;
  let manual = false, note = '', busy = false;   // note: the last result message, shown under the mic
  let changing = false;                           // the change box (Refine with AI) is on: after "Start edit" / "Say a change"
  // Voice: mode = null (commands only) | 'phrase' (after "Say it" / "Create new") | 'change' (after "Start edit" / "Say a change").
  // Spoken words collect in buf and show in the Hearing box; when the student finishes they go where they belong.
  const voice = { rec: null, want: false, mode: null, paused: false, buf: '', pre: '' };   // pre: a one-time note (e.g. the workspace mic was turned off)
  const $e = (sel) => hosts.edit && hosts.edit.querySelector(sel);
  const aiBox = () => $e('#lz-ai-in');

  /* ---------- The selected part of the student's equation ---------- */
  const node = () => L && (L.byId.get(selId) || L.root);
  const isRoot = (n) => !L.parent(n);
  const nameOf = (n) => (isRoot(n) ? 'Whole equation' : L.label(n));
  const saidOf = (n) => { try { return Layers.plainText(L.speak(n)); } catch (e) { return ''; } };
  const texOf = (n) => L.tex(n).replace(/\s+/g, ' ').trim();
  const layersOk = (latex) => { try { Layers.build(latex); return !!latex.trim(); } catch (e) { return false; } };
  const say = (t) => { if (ctx) ctx.announce(t); };
  const needAttempt = () => { if (L) return false; setNote('Say the phrase first (press “Say it”), then fix what you got.'); return true; };

  function target(dir) {
    const n = node(); if (!n) return null;
    if (dir === 'out') return L.parent(n);
    if (dir === 'in') return L.nav(n)[0] || null;
    const p = L.parent(n); if (!p) return null;
    const sib = L.nav(p); return sib[sib.indexOf(n) + (dir === 'next' ? 1 : -1)] || null;
  }
  function select(id) {
    selId = id; draw(); highlight();
    const n = node(); say(nameOf(n) + ': ' + saidOf(n));
  }
  function move(dir) {
    if (needAttempt()) return;
    const t = target(dir);
    if (t) select(t.id);
    else say({ out: 'Already at the whole equation.', in: 'Nothing inside this part.', next: 'No part to the right.', prev: 'No part to the left.' }[dir]);
  }
  // Same message as the workspace's "Select that".
  function selectThat() { if (needAttempt()) return; const n = node(); setNote('Selected ' + nameOf(n) + ': “' + saidOf(n) + '”. Say “Delete”, or “Say a change”.'); }

  // Highlight the selected part inside the student's equation (drawn from tagged LaTeX: each part is an SVG group
  // with class mx-<id>). Uses its own class so the Math Workspace's highlighter never touches it.
  function highlight() {
    const eq = ctx && ctx.eq && ctx.eq(); if (!eq) return;
    eq.querySelectorAll('rect.lz-hl').forEach((r) => r.remove());
    const n = node(); if (!n || isRoot(n)) return;
    eq.querySelectorAll('svg .mx-' + n.id).forEach((g) => {
      let bb; try { bb = g.getBBox(); } catch (e) { return; }
      if (!bb || (!bb.width && !bb.height)) return;
      const pad = 45, r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('class', 'lz-hl');
      r.setAttribute('x', bb.x - pad); r.setAttribute('y', bb.y - pad);
      r.setAttribute('width', bb.width + pad * 2); r.setAttribute('height', bb.height + pad * 2); r.setAttribute('rx', 70);
      r.setAttribute('style', 'fill:var(--l1);stroke:var(--s1);stroke-width:45');
      g.insertBefore(r, g.firstChild);
    });
  }
  function partFromEvent(e, root) {
    let el = e.target;
    while (el && el !== root) {
      const cls = el.getAttribute && el.getAttribute('class');
      if (cls) { const m = cls.match(/(?:^|\s)mx-(\d+)(?:\s|$)/); if (m) return +m[1]; }
      el = el.parentNode;
    }
    return null;
  }

  /* ---------- Fixes ---------- */
  function setNote(t) { note = t; draw(); say(t); }
  function apply(latex, message) {
    if (!latex || !layersOk(latex)) { setNote('That change didn’t make a valid equation, so nothing was changed.'); return; }
    if (latex === ctx.latex) { setNote('That gives the same equation, so nothing changed.'); return; }
    note = message;
    ctx.edit(latex, message);   // practice.js updates the attempt, checks it again, and calls render()
  }
  // "Delete": the same rules as the workspace's deleteLayer(), on a fresh copy of the layer tree.
  function del() {
    if (needAttempt()) return;
    const n = node();
    if (isRoot(n)) { setNote('Pick a part first. Deleting the whole equation would leave nothing to fix.'); return; }
    const said = saidOf(n), T = Layers.build(ctx.latex), m = T.byId.get(n.id), p = T.parent(m);
    const ph = () => ({ t: 'atom', k: 'sym', tex: '\\square', id: -1 });
    const isOp = (k) => k && k.t === 'atom' && k.k === 'op';
    if (p.t === 'row') {
      const i = p.kids.indexOf(m);
      if (isOp(p.kids[i - 1])) p.kids.splice(i - 1, 2); else if (isOp(p.kids[i + 1])) p.kids.splice(i, 2); else p.kids.splice(i, 1);
      if (!p.kids.length) p.kids.push(ph());
    } else if (p.t === 'script') { if (p.sub === m) p.sub = null; else if (p.sup === m) p.sup = null; else p.base = ph(); }
    else if (p.t === 'sqrt' && p.idx === m) p.idx = null;
    else if (p.t === 'matrix') { if (p.rows.length > 1) p.rows.splice(p.rows.indexOf(m), 1); else { setNote('That would remove the whole matrix. Pick an entry instead.'); return; } }
    else if (p.t === 'mrow') p.cells[p.cells.indexOf(m)] = ph();
    else ['num', 'den', 'body', 'base'].forEach((f) => { if (p[f] === m) p[f] = ph(); });
    apply(T.tex(T.root).replace(/\s+/g, ' ').trim(), 'Deleted “' + said + '”.');
  }
  // "Refine manually" / "Done": edit the LaTeX by hand.
  function setManual(on) {
    if (on && needAttempt()) return;
    manual = on; if (on) stopDictating();
    draw();
    if (on) { const ta = $e('#lz-ed-tex'); if (ta) ta.focus(); say('Editing the LaTeX by hand. Say or press “Done” when finished.'); }
  }
  function applyManual() {
    const ta = $e('#lz-ed-tex'); if (!ta) return;
    const v = ta.value.trim();
    if (!layersOk(v)) { setNote('That LaTeX couldn’t be read. Check the braces and try again.'); return; }
    manual = false;
    if (v === ctx.latex) { setNote('No changes to the LaTeX.'); return; }
    apply(v, 'LaTeX updated.');
  }

  /* ---------- Refine with AI: same prompt and behavior as the workspace (one result, applied right away) ---------- */
  async function refineAI() {
    if (busy || needAttempt()) return;
    if (!changing) { setNote('Say “Start edit” or “Say a change” first (or press “Say a change”), then describe the change.'); return; }
    stopDictating();   // moves what was said into the change box
    const box = aiBox(), req = box ? box.value.trim() : '', n = node(), latex = ctx.latex;
    if (!claudeReady()) { setNote('Refine with AI needs Claude. Add your API key in the sidebar, or use “Refine manually”.'); return; }
    busy = true; setNote('Refining ' + nameOf(n) + ' with Claude…');
    try {
      const r = await sample.json(
        'You edit a LaTeX equation for a student who works by voice. The request comes from speech recognition and may contain recognition errors; infer the intended math.\n' +
        'Full equation: ' + JSON.stringify(latex) + '\n' +
        'Selected part (' + nameOf(n) + '): ' + JSON.stringify(L.tex(n).replace(/\s+/g, ' ')) + '\n' +   // exactly as the workspace's scopeInfo().tex
        'Request: ' + JSON.stringify(req || 'Fix likely speech-recognition or notation mistakes in the selected part.') + '\n' +
        'Change only the selected part unless the request clearly says otherwise; keep everything else identical. ' +
        'Return JSON only: {"latex": string} with the full updated equation body, no $ or \\[ delimiters, valid for MathJax with amsmath.',
        { modelTier: 'quick' });
      busy = false;
      if (ctx.latex !== latex) return;   // the equation changed while waiting
      if (!r || typeof r.latex !== 'string' || !r.latex.trim()) throw new Error('No LaTeX came back');
      const out = r.latex.trim(), b = aiBox(); if (b) b.value = '';
      changing = false;
      apply(out, 'Refined with Claude: “' + (ctx.speakText(out) || out) + '”.');
    } catch (e) {
      busy = false;
      if (ctx.latex !== latex) return;
      setNote('Couldn’t refine with Claude' + (e && e.message ? ': ' + e.message : '') + '. Try again or use “Refine manually”.');
    }
  }

  /* ---------- The mic: the workspace's own commands ---------- */
  // Fallback copy of the commands, used only if js/workspace/voice.js isn't loaded.
  const FALLBACK = [['create new', 'new'], ['start new', 'new'], ['start edit', 'edit'], ['start editing', 'edit'], ['edit equation', 'edit'],
    ['stop listening', 'standby'], ['turn off the mic', 'stop'], ['start listening', 'start'], ['resume', 'start'], ['select that', 'selthat'], ['navigate', 'selthat'],
    ['refine with ai', 'ai'], ['refine manually', 'manual'], ['say a change', 'change'], ['make a change', 'change'], ['out a layer', 'out'], ['in a layer', 'in'],
    ['out', 'out'], ['in', 'in'], ['previous', 'left'], ['back', 'left'], ['next', 'right'], ['pause', 'pause'], ['done', 'done'], ['stop', 'done'],
    ['clear', 'clear'], ['delete', 'del'], ['delete that', 'del'], ['save', 'save']];
  const commands = () => { try { if (Array.isArray(CMDS)) return CMDS; } catch (e) {} return FALLBACK; };
  const trailing = () => { try { if (Array.isArray(TRAIL)) return TRAIL; } catch (e) {} return ['stop listening', 'pause', 'done', 'stop', 'clear', 'save']; };
  const vnorm = (t) => t.toLowerCase().replace(/[,!?;:]/g, ' ').replace(/\.(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();   // same as the workspace's norm()
  const entry = () => { try { if (Array.isArray(ENTRY)) return ENTRY; } catch (e) {} return FALLBACK.filter((c) => c[1] === 'new' || c[1] === 'edit'); };
  function parse(t) {   // same matching as the workspace's parseChunk(): a whole command, or a command at the end of the words
    const n = vnorm(t), all = commands(), whole = all.find((c) => c[0] === n);
    if (whole) return { text: '', cmd: whole[1] };
    if (!voice.mode) for (const [p, c] of entry()) if (n.endsWith(' ' + p)) return { text: '', cmd: c };   // e.g. "okay, start new"
    for (const p of trailing()) if (n.endsWith(' ' + p)) {
      const words = t.trim().split(/\s+/); const c = all.find((x) => x[0] === p);
      return { text: words.slice(0, words.length - p.split(' ').length).join(' '), cmd: c ? c[1] : null };
    }
    return { text: t, cmd: null };
  }
  function setLive(done, pending) {
    const live = hosts.voice && hosts.voice.querySelector('.lz-ed-live');
    try { LZ_PRACTICE.setLive(live, done, pending); } catch (e) { if (live) live.textContent = ((done || '') + ' ' + (pending || '')).trim(); }
  }
  function startDictating(mode, intro) {
    if (mode === 'change') { changing = true; const b = aiBox(); if (b) b.value = ''; }
    voice.mode = mode; voice.paused = false; voice.buf = '';
    setNote(voice.pre + intro); voice.pre = '';
  }
  // Stop collecting words. Words for a change appear in the change box all at once; the phrase is returned to check.
  function stopDictating() {
    const words = voice.buf.trim(), mode = voice.mode;
    if (mode === 'change' && words) { const b = aiBox(); if (b) b.value = words; }
    voice.mode = null; voice.paused = false; voice.buf = '';
    setLive('', '');
    return mode === 'phrase' ? words : '';
  }
  function finishPhrase() {
    const words = stopDictating();
    if (!words) { setNote('Didn’t catch anything. Press “Say it” and say the phrase.'); return; }
    ctx.onPhrase(words);   // practice.js checks it and redraws (with a fresh Fix it)
    setNote(voice.rec ? 'Checked. The mic is still on: fix it with “In a layer”, “Next”, “Select that”, “Delete” or “Say a change”, or say it again with “Create new”.' : 'Checked.');
  }
  function addWords(text) { voice.buf = (voice.buf ? voice.buf + ' ' : '') + text.trim(); setLive(voice.buf, ''); }
  const HINT = 'Say “Create new” to say the phrase again, or fix it with “Start edit”.';
  function heard(raw) {
    const { text, cmd } = parse(raw);
    if (text.trim()) {
      if (voice.mode && !voice.paused) addWords(text);
      else if (!cmd) setNote('Heard “' + text.trim() + '”, which isn’t a command. ' + HINT);
    }
    if (cmd) run(cmd);
  }
  function run(c) {
    switch (c) {
      case 'new':   // the workspace's "Create new" = this page's "Say it": dictate the phrase
        if (manual) setManual(false);
        if (!ctx.hasPhrase) { setNote('This example has no phrase to practice.'); return; }
        startDictating('phrase', 'Listening. Say the phrase, then “Done”.'); return;
      case 'start':
        if (voice.mode && voice.paused) { voice.paused = false; setNote('Listening again. New words are added to the end.'); return; }
        if (!voice.mode) run('new');
        return;
      case 'selthat': selectThat(); return;
      case 'del': del(); return;
      case 'out': move('out'); return;
      case 'in': move('in'); return;
      case 'left': move('prev'); return;
      case 'right': move('next'); return;
      case 'edit': {   // like the workspace: read back the selected part, then listen for the change
        if (needAttempt()) return; const n = node();
        startDictating('change', 'Editing ' + nameOf(n) + ': “' + saidOf(n) + '”. Say the change, then “Refine with AI”. Or move first with “Out a layer”, “In a layer”, “Previous”, “Next”.'); return;
      }
      case 'change': if (needAttempt()) return; startDictating('change', 'Say the change for ' + nameOf(node()) + '. Then say “Refine with AI” or “Done”.'); return;
      case 'ai': refineAI(); return;
      case 'done':
        if (manual) { applyManual(); return; }
        if (voice.mode === 'phrase') { finishPhrase(); return; }
        if (voice.mode === 'change' || changing) { refineAI(); return; }
        setNote('Nothing to finish. ' + HINT); return;
      case 'manual': setManual(!manual); return;
      case 'pause': if (!voice.mode) return; voice.paused = true; setNote('Paused. Words are no longer added. Say “Resume”, a command, or “Done”.'); return;
      case 'clear': voice.buf = ''; setLive('', ''); if (voice.mode !== 'phrase') { const b = aiBox(); if (b) b.value = ''; } setNote('Cleared.'); return;
      case 'standby': {
        const was = voice.mode, words = stopDictating();
        if (was === 'phrase' && words) { const inp = document.getElementById('lz-try-in'); if (inp) inp.value = words; setNote('Stopped dictating. What you said is in the box; press Check or edit it.'); return; }
        if (was === 'change') { setNote('Stopped dictating. Your change is in the box. Say “Refine with AI” or “Done” to apply it.'); return; }
        setNote('Stopped dictating. The mic is still on for commands.'); return;
      }
      case 'stop': stopVoice(); say('Mic muted.'); return;
      case 'save': setNote('“Save” works in the Math Workspace. Press “Open in Math Workspace”, then say “Save”.'); return;
      case 'help': setNote('You’re on MathSpeak Tutorial. ' + HINT); return;
      case 'pgnext': case 'pgprev': setNote('“Next page” and “Previous page” work on the Export page.'); return;
      case 'export': case 'workspace':   // leaving this page: hand the command to the workspace's own handler
        stopVoice();
        try { if (typeof runCmd === 'function') { runCmd(c, true); return; } } catch (e) {}
        try { go(c, true); } catch (e) {}
        return;
    }
  }
  function startVoice() {
    if (!SR) return false;
    if (voice.rec) return true;
    let pre = '';
    // The browser allows one listener at a time: turn off the Math Workspace mic first if it is on.
    try { if (typeof micOn !== 'undefined' && micOn && typeof stopRec === 'function') { stopRec(); pre = 'The Math Workspace mic was turned off so Practice can listen. '; } } catch (e) {}
    const r = new SR(); r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) heard(t); else interim += t; }
      setLive(voice.mode ? voice.buf : '', interim);
    };
    r.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      voice.want = false;
      setNote(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'The microphone is blocked here. Allow it in the browser, or type instead.' : 'Voice control stopped: ' + ev.error);
    };
    r.onend = () => {   // Chrome stops after a silence; keep listening until the student stops it
      if (voice.rec !== r) return;
      if (voice.want) { try { r.start(); return; } catch (e) {} }
      voice.rec = null; stopDictating(); draw();
    };
    try { r.start(); voice.rec = r; voice.want = true; voice.pre = pre; return true; }
    catch (e) { setNote('Couldn’t start the mic: ' + e.message); return false; }
  }
  function stopVoice() {
    const r = voice.rec; voice.want = false; voice.rec = null; stopDictating();
    try { if (r) r.abort(); } catch (e) {}
    if (hosts.voice && hosts.voice.isConnected) draw();
  }
  // Buttons that match spoken commands.
  function sayItButton() { if (!startVoice()) return; run('new'); }
  function changeButton() {
    if (needAttempt()) return;
    if (voice.rec) { run('change'); return; }
    changing = true; draw();
    const b = aiBox(); if (b) b.focus();
    say('Type the change for ' + nameOf(node()) + ', then press “Refine with AI”.');
  }
  function cancelChange() {
    voice.buf = ''; stopDictating(); changing = false;
    const b = aiBox(); if (b) b.value = '';
    setNote('Change cancelled.');
  }

  /* ---------- Drawing: the mic ---------- */
  // The Say it / Done button sits on the same line as the "Or type it" box (hosts.voiceBtn); the mic status,
  // what it's hearing, and messages go just below it (hosts.voice).
  function btnHTML() {
    return voice.mode
      ? '<button type="button" class="lz-btn lz-btn-primary lz-say" data-ed="done" data-k="ed-say">' + STOP + ' Done</button>'
      : '<button type="button" class="lz-btn lz-btn-primary lz-say" data-ed="sayit" data-k="ed-say"' + (SR && ctx.hasPhrase ? '' : ' disabled title="Voice needs Chrome or Edge"') + '>' + MIC + ' ' + (ctx.latex ? 'Say it again' : 'Say it') + '</button>';
  }
  function voiceHTML() {
    const listening = voice.mode && !voice.paused;
    const status = !voice.rec ? '' : voice.paused ? 'Paused · commands only' : voice.mode === 'phrase' ? 'Listening for the phrase' : voice.mode === 'change' ? 'Listening for your change' : 'Mic on · listening for commands';
    return '<div class="lz-voice">' +
      (status ? '<div class="lz-ed-row lz-voice-row"><span class="lz-mode' + (listening ? ' lz-mode-on' : '') + '">' + status + '</span>' +
        (voice.rec && !voice.mode ? '<button type="button" class="lz-btn lz-btn-sm" data-ed="micoff" data-k="ed-micoff">Turn off the mic</button>' : '') + '</div>' : '') +
      '<p class="lz-ed-live lz-live" aria-hidden="true"></p>' +
      '<p class="lz-ed-note" role="status">' + h(note) + '</p>' +
      '</div>';
  }
  /* ---------- Drawing: Fix it (the student's equation) ---------- */
  const mvBtn = (dir, label, key, keyName) => '<button type="button" class="lz-btn lz-btn-sm" data-ed="mv" data-dir="' + dir + '" data-k="ed-' + dir + '" aria-keyshortcuts="' + keyName + '"' +
    (target(dir) ? '' : ' disabled') + '>' + label + ' <kbd aria-hidden="true">' + key + '</kbd></button>';
  function editHTML() {
    const n = node(), inside = n ? L.nav(n) : [];
    return '<p class="lz-ed-sel"><span class="lz-hint">Selected:</span> <b>' + h(nameOf(n)) + '</b>' + (isRoot(n) ? '' : ' <span class="lz-ed-said">“' + h(saidOf(n)) + '”</span>') + '</p>' +
      '<div class="lz-ed-row" role="group" aria-label="Move through your equation">' +
        mvBtn('out', 'Out a layer', '↑', 'ArrowUp') + mvBtn('prev', 'Previous', '←', 'ArrowLeft') + mvBtn('next', 'Next', '→', 'ArrowRight') + mvBtn('in', 'In a layer', '↓', 'ArrowDown') + '</div>' +
      (inside.length ? '<div class="lz-parts"><span class="lz-hint">Inside:</span> ' + inside.map((k) =>
        '<button type="button" class="lz-part" data-ed="pick" data-id="' + k.id + '" data-k="ed-p' + k.id + '" title="' + h(texOf(k)) + '">' + h(L.label(k)) + '</button>').join('') + '</div>' : '') +
      '<div class="lz-ed-row">' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="sel" data-k="ed-sel">“Select that”</button>' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="del" data-k="ed-del"' + (isRoot(n) ? ' disabled' : '') + '>“Delete”</button>' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="change" data-k="ed-change" aria-pressed="' + changing + '" aria-controls="lz-ai-in">“Say a change”</button>' +
        // Like the workspace's command bar: "Refine with AI" next to "Refine manually". It opens the change box if it's
        // closed; with a change already described, it applies it.
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="aibtn" data-k="ed-aibtn"' + (busy ? ' disabled' : '') + '>“Refine with AI”</button>' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="manual" data-k="ed-manual" aria-expanded="' + manual + '" aria-controls="lz-ed-manual">' + (manual ? '“Done editing”' : '“Refine manually”') + '</button>' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="undo" data-k="ed-undo"' + (ctx.canUndo ? '' : ' disabled') + '>Undo</button></div>' +
      (manual ? '<div class="lz-ed-manual" id="lz-ed-manual"><label class="lz-hint" for="lz-ed-tex">Edit the LaTeX, then press Done (or Ctrl+Enter).</label>' +
        '<textarea class="lz-input lz-ed-tex" id="lz-ed-tex" data-k="ed-tex" rows="3" spellcheck="false">' + h(ctx.latex) + '</textarea>' +
        '<div class="lz-ed-row"><button type="button" class="lz-btn lz-btn-sm lz-btn-primary" data-ed="mdone" data-k="ed-mdone">“Done”</button>' +
        '<button type="button" class="lz-btn lz-btn-sm" data-ed="mcancel" data-k="ed-mcancel">Cancel</button></div></div>' : '') +
      // The change box (Refine with AI): only after "Start edit" / "Say a change".
      (changing
        ? '<div class="lz-ed-row lz-ai-on"><span class="lz-hint">Changing: <b>' + h(nameOf(n)) + '</b>' +
            (voice.mode === 'change' ? (voice.paused ? ' · paused' : ' · listening. Your words appear here when you say “Done”.') : '') + '</span>' +
            '<button type="button" class="lz-btn lz-btn-sm" data-ed="aicancel" data-k="ed-aicancel">Cancel</button></div>' +
          '<form class="lz-try-form" data-ed="ai"><label class="sr" for="lz-ai-in">Describe the change</label>' +
            '<input class="lz-input" id="lz-ai-in" data-k="ed-ai" autocomplete="off" spellcheck="false" placeholder="Describe the change, e.g. make the exponent 3">' +
            '<button type="submit" class="lz-btn lz-btn-primary" data-k="ed-aigo"' + (busy ? ' disabled' : '') + '>“Refine with AI”</button></form>' +
          (claudeReady() ? '' : '<p class="lz-hint">Refine with AI needs Claude: add your API key in the sidebar.</p>')
        : '');
  }
  /* ---------- The two instruction boxes ---------- */
  function renderInfo(host) {
    if (!host) return;
    host.innerHTML = '<section class="lz-box" aria-labelledby="lz-chg-h" data-tour="lz-change">' +
      '<h4 id="lz-chg-h" class="lz-box-h">Change an element</h4>' +
      // The voice flow, in the order a student uses it. Wording matches the workspace commands (js/workspace/voice.js).
      '<ol class="lz-chain" aria-label="Steps, in order">' +
        '<li>' + cmd('Start edit') + ' reads back the selected part and starts editing</li>' +
        '<li>' + cmd('In a layer') + ' goes to the leftmost part inside it</li>' +
        '<li>' + cmd('Next') + ' moves right on the same layer (' + cmd('Previous') + ' moves left)</li>' +
        '<li>' + cmd('Out a layer') + ' moves out to a broader part of the equation</li>' +
        '<li>' + cmd('Select that') + ' reads back the part you’re on</li>' +
        '<li>' + cmd('Delete') + ' removes it, or say the new version, like “make it 3”</li>' +
        '<li>' + cmd('Done') + ' applies the change</li>' +
      '</ol>' +
      '<p class="lz-hint">To type the LaTeX yourself (no AI), use ' + cmd('Refine manually') + '. Try it in Practice: press Say it, then fix what you got.</p>' +
      '</section>' +
      '<section class="lz-box" aria-labelledby="lz-ai-h" data-tour="lz-ai">' +
      '<h4 id="lz-ai-h" class="lz-box-h">Refine with AI</h4>' +
      '<ol class="lz-chain" aria-label="Steps, in order">' +
        '<li>Pick a part (or keep the whole equation)</li>' +
        '<li>' + cmd('Say a change') + ' starts listening for your change</li>' +
        '<li>say what to change, like “make the exponent 3”</li>' +
        '<li>' + cmd('Refine with AI') + ' or ' + cmd('Done') + ' has Claude apply it to that part</li>' +
      '</ol>' +
      '<p class="lz-hint">While you describe it: ' + cmd('Pause') + ', ' + cmd('Resume') + ', ' + cmd('Clear') + ' or ' + cmd('Stop listening') + '. Try it in Practice.</p>' +
      '</section>';
  }

  function draw() {
    if (!ctx) return;
    const a = document.activeElement;
    const inHost = (el) => el && [hosts.voiceBtn, hosts.voice, hosts.edit].some((x) => x && x.contains(el));
    const k = inHost(a) && a.dataset ? a.dataset.k : null;
    const keep = {};   // keep anything typed in the change box across a redraw
    if (hosts.edit) hosts.edit.querySelectorAll('input[id]').forEach((i) => { keep[i.id] = i.value; });
    if (hosts.voiceBtn) hosts.voiceBtn.innerHTML = btnHTML();
    if (hosts.voice) hosts.voice.innerHTML = voiceHTML();
    if (hosts.edit) {
      hosts.edit.innerHTML = L ? editHTML() : '';
      Object.keys(keep).forEach((id) => { const i = hosts.edit.querySelector('#' + id); if (i) i.value = keep[id]; });
    }
    if (voice.mode) setLive(voice.buf, '');
    if (k) {
      const sel = '[data-k="' + CSS.escape(k) + '"]', b = [hosts.voiceBtn, hosts.voice, hosts.edit].map((x) => x && x.querySelector(sel)).find(Boolean);
      if (b && !b.disabled) b.focus({ preventScroll: true });
      else { const eq = ctx.eq && ctx.eq(); if (eq) eq.focus({ preventScroll: true }); }
    }
  }

  /* ---------- Events ---------- */
  function onClick(e) {
    const b = e.target.closest('[data-ed]'); if (!b || b.disabled || b.tagName === 'FORM') return;
    const a = b.dataset.ed;
    if (a === 'mv') move(b.dataset.dir);
    else if (a === 'pick') select(+b.dataset.id);
    else if (a === 'sel') selectThat();
    else if (a === 'del') del();
    else if (a === 'undo') ctx.undo();
    else if (a === 'manual') { if (manual) applyManual(); else setManual(true); }
    else if (a === 'mdone') applyManual();
    else if (a === 'mcancel') setManual(false);
    else if (a === 'sayit') sayItButton();
    else if (a === 'done') run('done');
    else if (a === 'micoff') { stopVoice(); say('Mic muted.'); }
    else if (a === 'change') changeButton();
    else if (a === 'aibtn') {
      const b0 = aiBox();
      if (changing && (voice.mode === 'change' || (b0 && b0.value.trim()))) refineAI();
      else { if (!changing) changeButton(); setNote('Describe the change in the box, then press “Refine with AI”.'); const b = aiBox(); if (b) b.focus(); }
    }
    else if (a === 'aicancel') cancelChange();
  }
  function onSubmit(e) {
    const f = e.target.closest('[data-ed]'); if (!f) return;
    e.preventDefault();
    if (f.dataset.ed === 'ai') refineAI();
  }
  function onEqKey(e) {
    if (!L) return;
    if (e.key === 'Escape') { e.preventDefault(); select(L.root.id); return; }
    const dir = { ArrowUp: 'out', ArrowDown: 'in', ArrowLeft: 'prev', ArrowRight: 'next' }[e.key];
    if (!dir) return;
    e.preventDefault(); move(dir);
  }

  function render(hs, c) {
    hosts = hs || {}; ctx = c; L = c.layers;
    if (c.fresh || forLatex !== c.latex) {   // a new attempt or a changed equation starts at the whole equation
      if (c.fresh) note = '';
      forLatex = c.latex; selId = L ? L.root.id : null; manual = false;
      changing = false; if (voice.mode === 'change') { voice.mode = null; voice.paused = false; voice.buf = ''; }   // the change box turns off again
    }
    [hosts.voiceBtn, hosts.voice, hosts.edit].forEach((el) => {
      if (!el) return;
      el.addEventListener('click', onClick);
      el.addEventListener('submit', onSubmit);
    });
    if (hosts.edit) hosts.edit.addEventListener('keydown', (e) => { if (e.target.id === 'lz-ed-tex' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyManual(); } });
    const eq = c.eq && c.eq();
    if (eq && L) {
      eq.addEventListener('click', (e) => { const id = partFromEvent(e, eq); if (id != null && L.byId.has(id)) select(id); });
      eq.addEventListener('keydown', onEqKey);
    }
    draw(); highlight();
  }

  return { render, renderInfo, stopVoice, highlight };
})();
