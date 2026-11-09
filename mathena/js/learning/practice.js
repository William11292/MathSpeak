// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// MathSpeak Help: Practice. The student presses "Say it" (or types) the example's phrase. What they said is converted
// with the same built-in rules the Math Workspace uses (ruleParse) and checked against the example. Then they can fix
// THEIR equation by voice or buttons (Fix it: refine-panels.js), the way they would in the workspace, and it checks
// again after every fix. The example itself never changes.
// render(host, example, latex) is called by learning-zone.js whenever the example changes.

const LZ_PRACTICE = (() => {
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let host = null, ex = null, target = '';
  // attempt: what the student said or typed, the equation it became, and their fixes to it.
  let attempt = null;   // { said, source: 'voice' | 'typed', latex, history: [], fixed, missing, extra, misheard }

  /* ---------- Comparing ---------- */
  const norm = (l) => l.replace(/\\left|\\right|\\,|\\cdot|\s+/g, '');
  const NUM = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
    .split(/\s+/).filter(Boolean).map((w) => NUM[w] || w);
  // Drop the workspace commands a student may say out of habit around the phrase, and undo speech-recognition
  // typing quirks that aren't the student's mistake: a trailing period, and "dx" / "dy" / "dt" typed as one word.
  const clean = (t) => t.replace(/^\s*(start listening|create new)[\s,.]*/i, '').replace(/[\s,.]*\b(done|save|stop listening)[\s.!]*$/i, '')
    .replace(/[.!?]+\s*$/, '').replace(/\bd([xyztur])\b/gi, 'd $1').trim();
  // Missing and extra words (grouped into runs) between the expected phrase and what was said.
  function diff(a, b) {
    const n = a.length, m = b.length, d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    const missing = [], extra = []; let i = 0, j = 0, last = '';
    const add = (list, w, kind) => { if (last === kind && list.length) list[list.length - 1] += ' ' + w; else list.push(w); last = kind; };
    while (i < n && j < m) {
      if (a[i] === b[j]) { i++; j++; last = ''; }
      else if (d[i + 1][j] >= d[i][j + 1]) add(missing, a[i++], 'm');
      else add(extra, b[j++], 'x');
    }
    while (i < n) add(missing, a[i++], 'm');
    while (j < m) add(extra, b[j++], 'x');
    return { missing, extra };
  }
  const layersOf = (latex) => { try { return Layers.build(latex); } catch (e) { return null; } };
  const speak = (latex) => { try { return Layers.plainText(Layers.build(latex).spokenHtml); } catch (e) { return ''; } };
  const announce = (t) => { const l = document.getElementById('lz-live'); if (l) { l.textContent = ''; requestAnimationFrame(() => { l.textContent = t; }); } };
  const correct = () => !!(attempt && attempt.latex && norm(attempt.latex) === norm(target));

  /* ---------- Checking what was said or typed ---------- */
  function setAttempt(raw, source) {
    const said = clean(raw || '');
    const inp = $('#lz-try-in'); if (inp && source === 'voice') inp.value = said;
    if (!said) { attempt = null; draw('<p class="lz-hint">Nothing to check yet. Press Say it, or type the phrase.</p>'); return; }
    if (looksLikeLatex(said)) { attempt = null; draw('<p class="lz-try-no">That’s LaTeX. Try saying it in words instead.</p>'); return; }
    let latex = ''; try { latex = (ruleParse(said) || '').trim(); } catch (e) {}
    const { missing, extra } = diff(words(ex.say), words(said));
    attempt = { said, source, latex: latex && layersOf(latex) ? latex : '', history: [], fixed: false, missing, extra,
      misheard: /\b(ex|why|see|bee|tee)\b/.test(said.toLowerCase()) };
    draw(null, true);
    announce(correct() ? 'Correct. That converts to this example.' : 'Not quite. You can fix it below, or say it again.');
  }
  // A fix from Fix it (Delete, a change from Claude, LaTeX typed by hand): update their equation and check again.
  function fix(latex, message) {
    if (!attempt) return;
    attempt.history.push(attempt.latex); attempt.latex = latex; attempt.fixed = true;
    draw();
    announce(message + ' ' + (correct() ? 'Now it matches the example. Correct!' : 'Still different from the example.'));
  }
  function undo() {
    if (!attempt || !attempt.history.length) { announce('Nothing to undo.'); return; }
    attempt.latex = attempt.history.pop(); attempt.fixed = attempt.history.length > 0;
    draw();
    announce('Undone. ' + (correct() ? 'Correct.' : 'Not quite yet.'));
  }
  function clearAll() {
    try { LZ_REFINE.stopVoice(); } catch (e) {}
    attempt = null; const inp = $('#lz-try-in'); if (inp) inp.value = '';
    draw(null, true); if (inp) inp.focus();
    announce('Cleared.');
  }

  /* ---------- Drawing ---------- */
  const $ = (sel) => host && host.querySelector(sel);
  function cardHTML() {
    if (!attempt) return '';
    const ok = correct(), sp = attempt.latex ? speak(attempt.latex) : '', L = attempt.latex ? layersOf(attempt.latex) : null;
    const list = (label, xs) => xs.length ? '<li>' + label + ': ' + xs.map((w) => '<q>' + h(w) + '</q>').join(', ') + '</li>' : '';
    return '<div class="lz-att' + (ok ? ' lz-att-ok' : '') + '">' +
      '<p class="lz-att-said">' + (attempt.source === 'voice' ? 'You said' : 'You typed') + ': <q>' + h(attempt.said) + '</q></p>' +
      (L ? '<div class="lz-att-eq" tabindex="0" role="img" aria-label="Your equation: ' + h(sp) + '. Arrow keys move between its parts."><span data-tex="' + h(L.tagged) + '"></span></div>' +
           '<p class="lz-hint">Reads as: “' + h(sp) + '”</p>'
         : '<p class="lz-try-no">Couldn’t turn that into math.</p>') +
      (ok ? '<p class="lz-try-ok">✓ Correct. ' + (attempt.fixed ? 'Your fixed equation matches the example.' : 'That converts to this example.') + '</p>'
          : '<p class="lz-try-no">✗ Not quite. ' + (attempt.fixed ? 'Still different from the example. Keep fixing it, or Say it again.' : 'Compare with the phrase above, then fix it below or Say it again.') + '</p>' +
            (!attempt.fixed && (attempt.missing.length || attempt.extra.length) ? '<ul class="lz-try-diff">' + list('Missing', attempt.missing) + list('Extra', attempt.extra) + '</ul>' : '') +
            (!attempt.fixed && attempt.misheard ? '<p class="lz-hint">Speech recognition sometimes hears letters as words, like “ex” for x. Say the letter clearly, or type it.</p>' : '')) +
      (L ? '<details class="lz-mml"><summary>Show LaTeX</summary><pre class="lz-code">' + h(attempt.latex) + '</pre></details>' : '') +
      '</div>';
  }
  // Redraw the result card and the mic / Fix it controls. fresh: a new attempt (Fix it starts at the whole equation).
  function draw(message, fresh) {
    const card = $('#lz-attempt');
    if (card) {
      card.innerHTML = message || cardHTML();
      card.querySelectorAll('[data-tex]').forEach((el) => { renderTex(el, el.dataset.tex, true); const m = el.querySelector('mjx-container'); if (m) m.setAttribute('aria-hidden', 'true'); });
    }
    const fixBox = $('#lz-fix-wrap'); if (fixBox) fixBox.hidden = !(attempt && attempt.latex);
    const clr = $('[data-pr="clear"]'), inp = $('#lz-try-in'); if (clr) clr.disabled = !(attempt || (inp && inp.value.trim()));
    try {
      LZ_REFINE.render({ voiceBtn: $('#lz-voice-btn'), voice: $('#lz-voice'), edit: $('#lz-fix') }, {
        latex: attempt && attempt.latex ? attempt.latex : null, layers: attempt && attempt.latex ? layersOf(attempt.latex) : null,
        fresh: !!fresh, canUndo: !!(attempt && attempt.history.length), hasPhrase: !!(ex && ex.say),
        edit: fix, undo, speakText: speak, announce, onPhrase: (t) => setAttempt(t, 'voice'),
        eq: () => $('#lz-attempt .lz-att-eq'),
      });
    } catch (e) {}
  }

  // Live view of what the mic is hearing: "Hearing" label, settled words in full color, words still being recognized lighter.
  function setLive(el, done, pending) {
    if (!el) return;
    done = (done || '').trim(); pending = (pending || '').trim();
    el.textContent = '';
    if (!done && !pending) return;
    const part = (cls, t) => { const s = document.createElement('span'); s.className = cls; s.textContent = t; return s; };
    el.append(part('lz-live-label', 'Hearing'), part('lz-live-done', done), part('lz-live-pending', (done && pending ? ' ' : '') + pending));
  }

  function render(el, example, latex) {
    host = el; ex = example; target = latex; attempt = null;
    if (!host) return;
    host.innerHTML = ex.say
      ? '<p class="lz-flow">Say: <q class="lz-phrase">' + h(ex.say) + '</q></p>' +
        '<div class="lz-try-row">' +
          '<div id="lz-voice-btn" class="lz-voice-btn"></div>' +   // Say it / Done (refine-panels.js)
          '<form class="lz-try-form" data-pr="form"><label class="sr" for="lz-try-in">Or type what you would say</label>' +
            '<input class="lz-input" id="lz-try-in" autocomplete="off" spellcheck="false" placeholder="Or type it">' +
            '<button type="submit" class="lz-btn">Check</button></form>' +
          '<button type="button" class="lz-btn" data-pr="clear" disabled>Clear</button>' +
        '</div>' +
        '<div id="lz-voice"></div>' +   // mic status, what it's hearing, messages (refine-panels.js)
        '<div id="lz-attempt" role="status" aria-live="polite"></div>' +
        '<div class="lz-sub" id="lz-fix-wrap" role="group" aria-labelledby="lz-fix-h" hidden><h5 id="lz-fix-h" class="lz-sub-h">Fix it</h5>' +
          '<p class="lz-hint">Change your equation by voice or with the buttons. It checks again after every change.</p>' +
          '<div id="lz-fix" class="lz-edit"></div></div>'
      : '<p>' + h(ex.noSay) + '</p><p class="lz-hint">With Claude conversion on, describe it in your own words in the Math Workspace, or type the LaTeX.</p>';
    if (!ex.say) { try { LZ_REFINE.stopVoice(); } catch (e) {} return; }
    $('[data-pr="form"]').addEventListener('submit', (e) => { e.preventDefault(); try { LZ_REFINE.stopVoice(); } catch (x) {} setAttempt($('#lz-try-in').value, 'typed'); });
    $('#lz-try-in').addEventListener('input', () => { const c = $('[data-pr="clear"]'); if (c) c.disabled = !(attempt || $('#lz-try-in').value.trim()); });
    $('[data-pr="clear"]').addEventListener('click', clearAll);
    draw(null, true);
  }

  return { render, setLive, check: (t) => setAttempt(t, 'voice') };
})();
