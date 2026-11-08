// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Learning Zone: pick a subject (e.g. Calculus) and a topic (a notation type, e.g. Scripts), then see the example
// as an image, LaTeX, MathML and MathSpeak, with how to say it. Everything lives inside the LZ object so its names
// never collide with the rest of the app. Needs: LZ_DATA (library.js), LZ_REFINE (refine-panels.js), Layers, renderTex, mjReady.

const LZ = (() => {
  const D = LZ_DATA;
  const $id = (id) => document.getElementById(id);
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICONS = {
    right: '<path d="M9.5 6l6 6-6 6"/>', down: '<path d="M6 9.5l6 6 6-6"/>',
    prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>', next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const ic = (n, s = 16) => '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';

  /* ---------- Library lookups ---------- */
  const STRUCT_ORDER = Object.keys(D.STRUCT);
  const byId = (id) => D.EXAMPLES.find((e) => e.id === id);
  const inArea = (s, a) => D.EXAMPLES.filter((e) => e.subject === s && e.area === a);
  const topicsIn = (s, a) => STRUCT_ORDER.filter((k) => inArea(s, a).some((e) => e.struct === k));
  const examplesFor = (s, a, k) => inArea(s, a).filter((e) => e.struct === k);
  const topicName = (k) => D.STRUCT[k][0];

  /* ---------- Spoken text: the one place that turns LaTeX into MathSpeak ----------
     Uses Speak Math's own reading (Layers) so the Learning Zone says exactly what the Math Workspace says.
     To switch to another spoken style later, change only this function. */
  function speakText(latex) {
    try { return Layers.plainText(Layers.build(latex).spokenHtml); } catch (e) { return ''; }
  }
  function mathML(latex) {
    if (!(window.MathJax && MathJax.tex2mml)) return null;
    try { return MathJax.tex2mml(latex, { display: true }); } catch (e) { return null; }
  }
  const speechOf = new Map();   // example id -> spoken text (used by search)
  const spoken = (e) => { if (!speechOf.has(e.id)) speechOf.set(e.id, speakText(e.latex)); return speechOf.get(e.id); };

  /* ---------- State ----------
     subject: math | phys | chem   area: e.g. Calculus   topic: a notation type (key of D.STRUCT)
     The draft is the single source of truth for what the example shows. Library originals never change;
     Part 2's editing will change draft.latex only, and "Reset" copies the original back. */
  const state = { subject: 'math', area: 'Calculus', topic: 'largeop', exampleId: 8, open: { math: true, phys: false, chem: false }, q: '', eqWide: false };
  let draft = null;
  function setDraft(ex) { draft = { exampleId: ex.id, original: ex.latex, latex: ex.latex, edited: false }; }
  function layersOf(latex) { try { return Layers.build(latex); } catch (e) { return null; } }

  /* ---------- Search ---------- */
  function search(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return D.EXAMPLES.map((e) => {
      const hay = [e.title, e.area, D.SUBJECTS[e.subject], topicName(e.struct), e.latex, e.say || '', spoken(e)].join(' ').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (!hay.includes(w)) return null;
        if (e.title.toLowerCase().includes(w)) score += 3;
        if (e.area.toLowerCase().includes(w) || topicName(e.struct).toLowerCase().includes(w)) score += 2;
        score += 1;
      }
      return { e, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map((x) => x.e);
  }
  const searching = () => !!state.q.trim();
  // The list that Previous / Next walk through: search results while searching, otherwise every example in the
  // current area, in topic order (most topics have only one or two examples, so Next moves on to the next topic).
  function walkList() {
    if (searching()) { const r = search(state.q); if (r.some((e) => e.id === state.exampleId)) return { list: r, inSearch: true }; }
    return { list: topicsIn(state.subject, state.area).flatMap((k) => examplesFor(state.subject, state.area, k)), inSearch: false };
  }

  /* ---------- Rendering helpers ---------- */
  // Re-render a container but keep keyboard focus on the same control (matched by data-k).
  function keepFocus(container, fn) {
    const a = document.activeElement, k = a && container.contains(a) && a.dataset ? a.dataset.k : null;
    fn();
    if (k) { const b = container.querySelector('[data-k="' + CSS.escape(k) + '"]'); if (b) b.focus({ preventScroll: true }); }
  }
  function typeset(root) {
    root.querySelectorAll('[data-tex]').forEach((el) => {
      renderTex(el, el.dataset.tex, el.dataset.display === '1');
      const m = el.querySelector('mjx-container'); if (m) m.setAttribute('aria-hidden', 'true');
    });
  }
  const texSpan = (latex, cls, display) => '<span class="' + (cls || '') + '" data-tex="' + h(latex) + '"' + (display ? ' data-display="1"' : '') + '></span>';
  const announce = (msg) => { const l = $id('lz-live'); if (l) { l.textContent = ''; requestAnimationFrame(() => { l.textContent = msg; }); } };

  /* ---------- Summary bar: Subject · Topic · Example ---------- */
  function renderSummary() {
    const e = byId(state.exampleId);
    $id('lz-summary').innerHTML =
      '<div><dt>Subject</dt><dd>' + h(D.SUBJECTS[e.subject]) + ' › ' + h(e.area) + '</dd></div>' +
      '<div><dt>Topic</dt><dd>' + h(topicName(e.struct)) + '</dd></div>' +
      '<div><dt>Example</dt><dd>' + h(e.title) + '</dd></div>';
  }

  /* ---------- Left: Search Math Topics (Subjects | Topics) ---------- */
  function subjectsHTML() {
    return '<ul class="lz-subjects">' + Object.keys(D.SUBJECTS).map((s) => {
      const open = !!state.open[s];
      const areas = open ? '<ul class="lz-areas" id="lz-areas-' + s + '">' + D.TOPICS[s].map((a) => {
        const cur = state.subject === s && state.area === a;
        return '<li><button type="button" class="lz-pick" data-act="area" data-s="' + s + '" data-a="' + h(a) + '" data-k="a-' + s + '-' + h(a) + '"' + (cur ? ' aria-current="true"' : '') + '>' +
          '<span>' + h(a) + '</span><span class="lz-cnt" aria-label="' + inArea(s, a).length + ' examples">' + inArea(s, a).length + '</span></button></li>';
      }).join('') + '</ul>' : '';
      return '<li><button type="button" class="lz-group" data-act="subject" data-s="' + s + '" data-k="s-' + s + '" aria-expanded="' + open + '"' + (open ? ' aria-controls="lz-areas-' + s + '"' : '') + '>' +
        '<span>' + h(D.SUBJECTS[s]) + '</span>' + ic(open ? 'down' : 'right', 16) + '</button>' + areas + '</li>';
    }).join('') + '</ul>';
  }
  function topicsHTML() {
    const ks = topicsIn(state.subject, state.area);
    return '<ul class="lz-topic-list">' + ks.map((k) => {
      const cur = state.topic === k, n = examplesFor(state.subject, state.area, k).length;
      return '<li><button type="button" class="lz-pick" data-act="topic" data-t="' + k + '" data-k="t-' + k + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        '<span>' + h(topicName(k)) + '</span><span class="lz-cnt" aria-label="' + n + ' examples">' + n + '</span></button></li>';
    }).join('') + '</ul>';
  }
  function resultsHTML() {
    const r = search(state.q);
    if (!r.length) return '<p class="lz-hint" role="status">No examples match “' + h(state.q) + '”. Try fraction, root, integral or matrix.</p>';
    return '<p class="lz-hint" role="status">' + r.length + ' result' + (r.length === 1 ? '' : 's') + ' for “' + h(state.q) + '”</p>' +
      '<ul class="lz-results">' + r.map((e) => '<li><button type="button" class="lz-result" data-act="example" data-id="' + e.id + '" data-k="r-' + e.id + '"' + (e.id === state.exampleId ? ' aria-current="true"' : '') + '>' +
        '<span class="lz-result-t">' + h(e.title) + '</span><span class="lz-result-w">' + h(D.SUBJECTS[e.subject]) + ' › ' + h(e.area) + ' · ' + h(topicName(e.struct)) + '</span>' +
        texSpan(e.latex, 'lz-result-m') + '</button></li>').join('') + '</ul>';
  }
  function renderNav() {
    const cols = $id('lz-cols'), res = $id('lz-results');
    cols.hidden = searching(); res.hidden = !searching();
    if (searching()) keepFocus(res, () => { res.innerHTML = resultsHTML(); typeset(res); });
    else {
      keepFocus($id('lz-subj-body'), () => { $id('lz-subj-body').innerHTML = subjectsHTML(); });
      keepFocus($id('lz-topic-body'), () => { $id('lz-topic-body').innerHTML = topicsHTML(); });
      $id('lz-topic-h').textContent = 'Topics in ' + state.area;
    }
  }

  /* ---------- Right: Example ---------- */
  // Scope cues found in a dictation phrase, explained in context (only cues the rule parser supports).
  const CUES = [
    [/\bfraction\b.*\bend fraction\b/, '“fraction … over … end fraction”', 'starts a fraction; “over” splits top from bottom.'],
    [/\bsquare root of\b.*\bend root\b/, '“square root of … end root”', 'everything in between goes under the root.'],
    [/\bthe quantity\b.*\bclose quantity\b/, '“the quantity … close quantity”', 'parentheses around a group.'],
    [/\ball over\b/, '“all over”', 'puts everything since “equals” on top of a fraction.'],
    [/\babsolute value of\b.*\bend absolute value\b/, '“absolute value of … end absolute value”', 'bars around a group.'],
    [/\bintegral from\b.*\bto\b.*\bof\b/, '“integral from a to b of … d x”', 'bounds first; “d x” ends the integral.'],
    [/\bsum from\b.*\bto\b.*\bof\b/, '“sum from … to … of”', 'start and end values first, then what is added.'],
    [/\blimit as\b.*\b(approaches|goes to)\b/, '“limit as x approaches a of”', 'the variable and its target first.'],
    [/\b(squared|cubed)\b/, '“squared”, “cubed”', 'the exponents 2 and 3.'],
    [/\bsub\b/, '“sub”', 'the next word is a subscript.'],
    [/\bplus or minus\b/, '“plus or minus”', 'the ± sign.'],
    [/\bnegative\b/, '“negative”', 'a minus sign in front of a term.'],
  ];
  const BINARY_OVER = [/\bover\b/, '“over”', 'a fraction of the term before and the term after.'];
  function cuesFor(say) {
    const found = CUES.filter(([re]) => re.test(say));
    const rest = say.replace(/\ball over\b/g, '').replace(/\bfraction\b.*?\bend fraction\b/g, '');
    if (BINARY_OVER[0].test(rest)) found.push(BINARY_OVER);
    return found;
  }
  function sayHTML(e) {
    if (!e.say) {
      return '<p>' + h(e.noSay) + '</p><p class="lz-hint">With Claude conversion on, describe it in your own words in the Math Workspace, or type the LaTeX.</p>';
    }
    const cues = cuesFor(e.say);
    return '<p class="lz-flow">Say: <q class="lz-phrase">' + h(e.say) + '</q></p>' +
      '<div id="lz-try"></div>' +
      (cues.length ? '<ul class="lz-cues" aria-label="Cues in this phrase">' + cues.map((c) => '<li><b>' + c[1] + '</b> ' + c[2] + '</li>').join('') + '</ul>' : '') +
      '<p class="lz-hint">In the Math Workspace: <span class="lz-cmd">“Start listening”</span> → the phrase → <span class="lz-cmd">“Done”</span> → <span class="lz-cmd">“Save”</span>. Made a mistake? <span class="lz-cmd">“Pause”</span>, <span class="lz-cmd">“Clear”</span> or <span class="lz-cmd">“Stop listening”</span>.</p>';
  }
  function exampleHTML() {
    const e = byId(state.exampleId), { list, inSearch } = walkList(), i = list.findIndex((x) => x.id === e.id);
    const speech = speakText(draft.latex), mml = mathML(draft.latex), few = list.length < 2;
    return '<div class="lz-ex-bar">' +
        '<h3 id="lz-ex-title" class="lz-h" tabindex="-1">Example: ' + h(e.title) + '</h3>' +
        '<span class="lz-hint">' + (i + 1) + ' of ' + list.length + (inSearch ? ' search results' : ' in ' + h(e.area)) + '</span>' +
        '<div class="lz-pager" role="group" aria-label="Examples">' +
          '<button type="button" class="lz-btn" data-act="step" data-dir="-1" data-k="prev"' + (few ? ' disabled' : '') + '>' + ic('prev', 14) + ' Previous</button>' +
          '<button type="button" class="lz-btn lz-btn-primary" data-act="step" data-dir="1" data-k="next"' + (few ? ' disabled' : '') + '>Next example ' + ic('next', 14) + '</button>' +
        '</div></div>' +
      '<div class="lz-ex-body">' +
        '<div class="lz-row2' + (state.eqWide ? ' lz-eq-wide' : '') + '" id="lz-eq-row">' +
          '<section class="lz-box" aria-labelledby="lz-eq-h"><div class="lz-box-hrow">' +
            '<h4 id="lz-eq-h" class="lz-box-h">Equation' + (draft.edited ? ' <span class="lz-tag">Edited</span>' : '') + '</h4>' +
            '<div class="lz-eq-tools" role="group" aria-label="Equation actions">' +
              '<button type="button" class="lz-btn lz-btn-sm" data-act="eqsize" data-k="eqsize" aria-pressed="' + !!state.eqWide + '" aria-controls="lz-eq-row">' + (state.eqWide ? 'Shrink' : 'Expand') + '</button>' +
              // A "Reset to original" button goes here once Change an element / Refine with AI can edit the draft (calls resetDraft()).
              '<button type="button" class="lz-btn lz-btn-sm" data-act="workspace" data-k="workspace">' + ic('open', 14) + ' Open in Math Workspace</button>' +
            '</div></div>' +
            // Never wraps: a long equation scrolls sideways (focus it and use the arrow keys).
            '<div class="lz-eq" role="img" tabindex="0" aria-label="' + h(speech || e.title) + '"><div class="lz-eq-in">' + texSpan(draft.latex, '', true) + '</div></div></section>' +
          '<section class="lz-box" aria-labelledby="lz-tex-h"><h4 id="lz-tex-h" class="lz-box-h">LaTeX</h4>' +
            '<pre class="lz-code" tabindex="0" aria-labelledby="lz-tex-h">' + h(draft.latex) + '</pre>' +
            '<details class="lz-mml"><summary>Show MathML</summary>' +
              (mml ? '<pre class="lz-code" tabindex="0" aria-label="MathML markup">' + h(mml) + '</pre>' : '<p class="lz-hint">MathML appears once the math renderer has loaded.</p>') + '</details></section>' +
        '</div>' +
        '<section class="lz-box" aria-labelledby="lz-ms-h"><div class="lz-box-hrow"><h4 id="lz-ms-h" class="lz-box-h">Hear the MathSpeak</h4>' +
          '<button type="button" class="lz-btn lz-btn-sm" data-act="play" data-k="play" aria-pressed="false"' + ('speechSynthesis' in window ? '' : ' disabled title="Audio isn’t available in this browser"') + '>' + ic('speaker', 14) + ' <span>Play</span></button></div>' +
          '<p class="lz-ms">' + h(speech || 'This example couldn’t be read into layers.') + '</p></section>' +
        '<section class="lz-box" aria-labelledby="lz-say-h"><h4 id="lz-say-h" class="lz-box-h">Practice</h4>' + sayHTML(e) + '</section>' +
        '<section class="lz-box" aria-labelledby="lz-why-h"><h4 id="lz-why-h" class="lz-box-h">Why it’s read this way</h4><p class="lz-why">' + h(D.STRUCT[e.struct][1]) + '</p></section>' +
        '<div class="lz-row2" id="lz-refine" data-tour="lz-refine"></div>' +
      '</div>';
  }
  function renderExample() {
    const box = $id('lz-example');
    stopAudio();
    keepFocus(box, () => { box.innerHTML = exampleHTML(); typeset(box); });
    LZ_PRACTICE.render($id('lz-try'), byId(state.exampleId), draft.latex);
    LZ_REFINE.render($id('lz-refine'), { draft, layers: layersOf(draft.latex) });
    renderSummary();
  }

  /* ---------- Audio ---------- */
  function stopAudio() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} setPlayBtn(false); }
  function setPlayBtn(on) {
    const b = document.querySelector('#lz-example [data-act="play"]'); if (!b) return;
    b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'stop' : 'speaker', 14) + ' <span>' + (on ? 'Stop' : 'Play') + '</span>';
  }
  function play() {
    const b = document.querySelector('#lz-example [data-act="play"]');
    if (b && b.getAttribute('aria-pressed') === 'true') { stopAudio(); return; }
    const text = speakText(draft.latex); if (!text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95;
      u.onend = u.onerror = () => setPlayBtn(false);
      speechSynthesis.speak(u); setPlayBtn(true);
    } catch (e) { announce('Audio isn’t available here.'); }
  }

  /* ---------- Actions ---------- */
  function showExample(id, opts = {}) {
    const e = byId(+id); if (!e) return;
    Object.assign(state, { exampleId: e.id, subject: e.subject, area: e.area, topic: e.struct }); state.open[e.subject] = true;
    setDraft(e); renderNav(); renderExample();
    if (opts.announce !== false) announce('Example: ' + e.title + '.');
    if (opts.focusCard) { const t = $id('lz-ex-title'); if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); t.focus({ preventScroll: true }); } }
  }
  const narrow = () => matchMedia('(max-width: 1100px)').matches;
  function onClick(ev) {
    const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'subject') { const s = b.dataset.s; state.open[s] = !state.open[s]; renderNav(); announce(D.SUBJECTS[s] + (state.open[s] ? ' expanded.' : ' collapsed.')); }
    else if (act === 'area') {
      const s = b.dataset.s, a = b.dataset.a, k = topicsIn(s, a)[0];
      const first = k && examplesFor(s, a, k)[0];
      if (first) showExample(first.id, { announce: false });
      announce(a + '. ' + topicsIn(s, a).length + ' topics. Showing ' + (first ? topicName(k) + ': ' + first.title : 'nothing') + '.');
    }
    else if (act === 'topic') {
      const first = examplesFor(state.subject, state.area, b.dataset.t)[0];
      if (first) showExample(first.id, { announce: false, focusCard: narrow() });
      announce(topicName(b.dataset.t) + '. Example: ' + (first ? first.title : 'none') + '.');
    }
    else if (act === 'example') showExample(b.dataset.id, { focusCard: narrow() });
    else if (act === 'step') {
      const { list } = walkList(), i = list.findIndex((x) => x.id === state.exampleId);
      showExample(list[(i + (+b.dataset.dir) + list.length) % list.length].id);
    }
    else if (act === 'play') play();
    else if (act === 'eqsize') {
      // Toggle in place (no re-render), so audio and a Try it result aren't interrupted.
      state.eqWide = !state.eqWide;
      $id('lz-eq-row').classList.toggle('lz-eq-wide', state.eqWide);
      b.setAttribute('aria-pressed', String(state.eqWide)); b.textContent = state.eqWide ? 'Shrink' : 'Expand';
      announce(state.eqWide ? 'Equation expanded to full width.' : 'Equation back to normal size.');
    }
    else if (act === 'workspace') openInWorkspace();
  }

  /* ---------- Draft: reset and hand-off ---------- */
  // Part 2's Change an element / Refine with AI call editDraft(); Reset copies the library original back.
  function editDraft(latex) {
    if (!draft || typeof latex !== 'string' || !latex.trim()) return;
    draft.latex = latex.trim(); draft.edited = draft.latex !== draft.original;
    renderExample();
  }
  function resetDraft() {
    if (!draft || !draft.edited) { announce('Nothing to reset. This is already the original example.'); return; }
    draft.latex = draft.original; draft.edited = false;
    renderExample();
    const b = document.querySelector('#lz-example [data-act="workspace"]'); if (b) b.focus();   // the Reset button is now inactive
    announce('Back to the original example.');
  }
  // Loads the shown equation (edited or not) into the Math Workspace, the same way opening a saved equation does,
  // but leaves it unsaved so the student decides whether to Save it.
  function openInWorkspace() {
    if (typeof setLatex !== 'function' || typeof go !== 'function') { announce('The Math Workspace isn’t available.'); return; }
    const e = byId(state.exampleId), next = draft.latex;
    let unsaved = false;
    try { unsaved = !!current.latex.trim() && current.latex !== next && savedLatex !== current.latex; } catch (err) {}
    if (unsaved && !window.confirm('The Math Workspace has an equation that isn’t saved. Replace it with this example?')) return;
    stopAudio(); LZ_PRACTICE.stop();
    try { spoken.value = draft.edited ? '' : (e.say || ''); current.source = 'typed'; } catch (err) {}
    setLatex(next);
    try { if (typeof chatNewEquation === 'function') chatNewEquation(); } catch (err) {}
    go('workspace', true);
    try { setStatus('Opened “' + e.title + '”' + (draft.edited ? ' (edited)' : '') + ' from MathSpeak Help. Say “Save” to keep it.', 'ok'); } catch (err) {}
  }

  /* ---------- Start-up ---------- */
  function init() {
    const page = $id('page-help'); if (!page) return;
    setDraft(byId(state.exampleId));
    page.addEventListener('click', onClick);
    const q = $id('lz-q');
    q.addEventListener('input', () => { state.q = q.value; renderNav(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape' && q.value) { e.preventDefault(); q.value = ''; state.q = ''; renderNav(); } });
    $id('lz-search-form').addEventListener('submit', (e) => { e.preventDefault(); const first = $id('lz-results').querySelector('.lz-result'); if (first) first.focus(); });
    // Stop audio when leaving the page; refresh when coming back (Claude may have connected meanwhile).
    new MutationObserver(() => { if (page.hidden) { stopAudio(); LZ_PRACTICE.stop(); } else renderExample(); }).observe(page, { attributes: true, attributeFilter: ['hidden'] });
    renderNav(); renderExample();
    // MathJax may finish loading after this script runs; draw the math again once it is ready.
    if (!mjReady()) { let n = 0; const t = setInterval(() => { if (mjReady() || ++n > 40) { clearInterval(t); if (mjReady()) { renderNav(); renderExample(); } } }, 250); }
  }
  init();

  // Small API for the tutorial overlay and Part 2's editing.
  return { showExample, getDraft: () => draft, editDraft, resetDraft, openInWorkspace, speakText, refresh: () => { renderNav(); renderExample(); } };
})();
