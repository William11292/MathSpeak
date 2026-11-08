// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Learning Zone: "Try it" practice. The student says (or types) the example's phrase; it is converted with the same
// built-in rules the Math Workspace uses (ruleParse) and compared with the example's LaTeX, so a pass here means the
// phrase works in the workspace too. Feedback shows what was heard, what it converted to, and missing / extra words.
// render(host, example, latex) is called by learning-zone.js whenever the example changes; stop() cancels listening.

const LZ_PRACTICE = (() => {
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MIC = '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>';
  const STOP = '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11"/></svg>';
  let host = null, ex = null, target = '', rec = null, cancelled = false;

  /* ---------- Comparing ---------- */
  const norm = (l) => l.replace(/\\left|\\right|\\,|\\cdot|\s+/g, '');
  const NUM = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
    .split(/\s+/).filter(Boolean).map((w) => NUM[w] || w);
  // Drop the workspace commands a student may say out of habit around the phrase, and undo speech-recognition
  // typing quirks that aren't the student's mistake: a trailing period, and "dx" / "dy" / "dt" typed as one word.
  const clean = (t) => t.replace(/^\s*start listening[\s,.]*/i, '').replace(/[\s,.]*\b(done|save|stop listening)[\s.!]*$/i, '')
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

  /* ---------- Checking ---------- */
  const $ = (sel) => host && host.querySelector(sel);
  function show(html) { const o = $('.lz-try-out'); if (o) { o.innerHTML = html; o.querySelectorAll('[data-tex]').forEach((el) => renderTex(el, el.dataset.tex, false)); } }
  function check(raw) {
    const said = clean(raw || '');
    if (!said) { show('<p class="lz-hint">Nothing to check yet. Say or type the phrase first.</p>'); return; }
    if (looksLikeLatex(said)) { show('<p class="lz-try-no">That’s LaTeX. Try saying it in words instead.</p>'); return; }
    let latex = ''; try { latex = ruleParse(said); } catch (e) {}
    const heard = '<p>We heard: <q>' + h(said) + '</q></p>';
    if (latex && norm(latex) === norm(target)) {
      show('<p class="lz-try-ok">✓ Correct. That converts to this example.</p>' + heard);
      return;
    }
    const { missing, extra } = diff(words(ex.say), words(said));
    const list = (label, xs) => xs.length ? '<li>' + label + ': ' + xs.map((w) => '<q>' + h(w) + '</q>').join(', ') + '</li>' : '';
    const misheard = /\b(ex|why|see|bee|tee)\b/.test(said.toLowerCase()) ? '<p class="lz-hint">Speech recognition sometimes hears letters as words, like “ex” for x. Say the letter clearly, or type it.</p>' : '';
    show('<p class="lz-try-no">Not quite. Compare with the phrase above.</p>' + heard +
      (latex ? '<p class="lz-try-got">That converts to: <span data-tex="' + h(latex) + '"></span></p>' : '') +
      ((missing.length || extra.length) ? '<ul class="lz-try-diff">' + list('Missing', missing) + list('Extra', extra) + '</ul>' : '') + misheard);
  }

  /* ---------- Listening ---------- */
  function setMicBtn(on) {
    const b = $('[data-pr="mic"]'); if (!b) return;
    b.setAttribute('aria-pressed', String(on)); b.innerHTML = (on ? STOP + ' Stop' : MIC + ' Try it');
  }
  function startMic() {
    let note = '';
    // The browser allows one listener at a time: turn off the Math Workspace mic first if it is on.
    try { if (typeof micOn !== 'undefined' && micOn && typeof stopRec === 'function') { stopRec(); note = 'The Math Workspace mic was turned off so Try it can listen. '; } } catch (e) {}
    let finalText = ''; cancelled = false;
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) finalText += ' ' + t; else interim += t; }
      const live = $('.lz-try-live'); if (live) live.textContent = (finalText + ' ' + interim).trim();
      if (/\b(done|stop listening)[\s.!]*$/i.test(finalText.trim())) stopMic(false);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      const blocked = ev.error === 'not-allowed' || ev.error === 'service-not-allowed';
      show('<p class="lz-try-no">' + (blocked ? 'The microphone is blocked here. Allow it in the browser, or type the phrase instead.' : 'Listening stopped: ' + h(ev.error) + '.') + '</p>');
    };
    rec.onend = () => {
      rec = null; setMicBtn(false);
      const live = $('.lz-try-live'); if (live) live.textContent = '';
      if (cancelled) return;
      if (finalText.trim()) check(finalText); else show('<p class="lz-hint">Didn’t catch anything. Press Try it and say the phrase.</p>');
    };
    try { rec.start(); setMicBtn(true); show('<p class="lz-hint">' + note + 'Listening. Say the phrase, then “Done” or press Stop.</p>'); }
    catch (e) { rec = null; show('<p class="lz-try-no">Couldn’t start the mic: ' + h(e.message) + '</p>'); }
  }
  function stopMic(cancel) { cancelled = !!cancel; if (!rec) return; try { cancel ? rec.abort() : rec.stop(); } catch (e) {} }

  /* ---------- Drawing ---------- */
  function render(el, example, latex) {
    stopMic(true);
    host = el; ex = example; target = latex;
    if (!host) return;
    if (!ex.say) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="lz-try">' +
      '<div class="lz-try-row">' +
        '<button type="button" class="lz-btn lz-btn-primary" data-pr="mic" aria-pressed="false"' + (SR ? '' : ' disabled title="Voice needs Chrome or Edge"') + '>' + MIC + ' Try it</button>' +
        '<form class="lz-try-form" data-pr="form"><label class="sr" for="lz-try-in">Or type what you would say</label>' +
          '<input class="lz-input" id="lz-try-in" autocomplete="off" spellcheck="false" placeholder="' + (SR ? 'Or type what you’d say' : 'Voice needs Chrome or Edge. Type what you’d say') + '">' +
          '<button type="submit" class="lz-btn">Check</button></form>' +
      '</div>' +
      '<p class="lz-try-live lz-hint"></p>' +
      '<div class="lz-try-out" role="status" aria-live="polite"></div></div>';
    $('[data-pr="mic"]').addEventListener('click', () => { if (rec) stopMic(false); else if (SR) startMic(); });
    $('[data-pr="form"]').addEventListener('submit', (e) => { e.preventDefault(); check($('#lz-try-in').value); });
  }

  return { render, stop: () => stopMic(true) };
})();
