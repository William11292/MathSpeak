// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: Select that, Delete, Save, Edit (manual, or Refine with AI with 3 choices)

/* "Select that": confirm the selection, read it back, and scope edits to it */
function selectThat() {
  if (!L) return;
  if (sel == null) sel = L.root.id;
  const n = L.byId.get(sel), say = Layers.plainText(L.speak(n)), sc = scopeInfo();
  highlight();
  setStatus('Selected ' + sc.name + ': “' + say + '”. Say “Delete”, or “Edit”.', 'ok');
  $('announce').textContent = 'Selected ' + sc.name + ': ' + say;
}

/* "Delete": remove the selected layer (and the operator next to it) from the tree, then rebuild the LaTeX */
function deleteLayer() {
  if (!L || sel == null) return;
  const n = L.byId.get(sel), p = L.parent(n), said = Layers.plainText(L.speak(n));
  if (!p) { setLatex(''); setStatus('Deleted the whole equation.', 'ok'); return; }
  const ph = () => ({ t: 'atom', k: 'sym', tex: '\\square', id: -1 });
  const isOp = (k) => k && k.t === 'atom' && k.k === 'op';
  if (p.t === 'row') {
    const i = p.kids.indexOf(n);
    if (isOp(p.kids[i - 1])) p.kids.splice(i - 1, 2);
    else if (isOp(p.kids[i + 1])) p.kids.splice(i, 2);
    else p.kids.splice(i, 1);
    if (!p.kids.length) p.kids.push(ph());
  } else if (p.t === 'script') {
    if (p.sub === n) p.sub = null; else if (p.sup === n) p.sup = null; else p.base = ph();
  } else if (p.t === 'sqrt' && p.idx === n) p.idx = null;
  else if (p.t === 'matrix') { if (p.rows.length > 1) p.rows.splice(p.rows.indexOf(n), 1); else { setLatex(''); return; } }
  else if (p.t === 'mrow') p.cells[p.cells.indexOf(n)] = ph();
  else ['num', 'den', 'body', 'base'].forEach((f) => { if (p[f] === n) p[f] = ph(); });
  const next = L.tex(L.root).replace(/\s+/g, ' ').trim();
  setLatex(next);
  setStatus('Deleted “' + said + '”.', 'ok'); $('announce').textContent = 'Deleted ' + said;
}

/* "Save": add the current equation to the Export list */
let savedLatex = null;
async function saveEquation() {
  const latex = current.latex.trim();
  if (!latex) { setStatus('Nothing to save yet.', 'err'); return; }
  if (savedLatex === current.latex) { setStatus('Already saved.', 'ok'); return; }
  const clean = L ? Layers.plainText(L.spokenHtml) : '';
  await addLog({ input: current.input || spoken.value.trim() || latex, latex: current.latex, clean,
    method: current.method || 'latex', source: current.src || 'typed', ts: Date.now() });
  savedLatex = current.latex; updateBar();
  setStatus('Saved to Export.', 'ok'); $('announce').textContent = 'Saved to Export: ' + clean;
}

/* ---------- "Edit" ----------
   "Refine with AI" is a toggle. Off (manual): the words said after "Edit" are the new math for the selected layer,
   converted with the built-in rules. On: the words describe a change; Claude returns 3 readings, shown under
   "Editing", and the student picks one by number. */
let aiRefine = false;      // the "Refine with AI" toggle
let aiChoices = null;      // [{ latex, said }] while waiting for "1" / "2" / "3"

function toggleRefineAI() {
  if (!aiRefine && !sample) { setStatus('Refine with AI needs Claude. Add your API key in the sidebar.', 'err'); return; }
  aiRefine = !aiRefine; if (!aiRefine) clearChoices();
  const m = aiRefine ? 'Refine with AI is on. After “Edit”, describe the change and pick one of 3 choices.'
    : 'Refine with AI is off. After “Edit”, say what replaces the selected part.';
  setStatus(m, 'ok'); $('announce').textContent = m; updateBar();
}

function applyEdit() { return aiRefine ? refineAI() : manualEdit(); }

/* Put new LaTeX in place of the selected layer, then rebuild the equation */
function replaceLayer(newTex) {
  const n = sel == null ? L.root : L.byId.get(sel), p = n && L.parent(n);
  if (!p) { setLatex(newTex); return; }
  const a = { t: 'atom', k: 'sym', tex: newTex, id: -1 };
  if (p.t === 'script' && p.base === n) { p.base = { ...a, tex: '{' + newTex + '}' }; }
  else for (const k of Object.keys(p)) {
    const v = p[k];
    if (v === n) { p[k] = a; break; }
    if (Array.isArray(v) && v.includes(n)) { v[v.indexOf(n)] = a; break; }
  }
  setLatex(L.tex(L.root).replace(/\s+/g, ' ').trim());
}

/* Manual (toggle off): the spoken words are the new selected part */
function manualEdit() {
  if (!L) { setStatus('Submit an equation first.', 'err'); return; }
  const said = wsInput.value.trim(), sc = scopeInfo();
  if (!said) { setStatus('Say “Edit”, then say what should replace ' + sc.name + '.', 'err'); return; }
  const tex = looksLikeLatex(said) ? said : ruleParse(said);
  if (!tex || !tex.trim()) { setStatus('Couldn\'t read “' + said + '” as math. Try again.', 'err'); return; }
  replaceLayer(tex.trim()); wsInput.value = ''; devSetResult(current.latex);
  const clean = L ? Layers.plainText(L.spokenHtml) : '';
  setStatus('Changed ' + sc.name + '. The equation is now “' + clean + '”. Say “Save” to keep it.', 'ok');
  $('announce').textContent = 'Changed ' + sc.name + '. Now: ' + clean;
  current.input = (current.input || spoken.value.trim()) + ' · then: ' + said; current.method = 'edit'; current.src = vMode === 'off' ? 'typed' : 'voice';
  updateBar();
}

/* The 3 choices, listed under "Editing" */
function clearChoices() { aiChoices = null; const ol = $('wsChoices'); ol.textContent = ''; ol.hidden = true; }
function showChoices(list) {
  aiChoices = list; const ol = $('wsChoices'); ol.textContent = ''; ol.hidden = false;
  list.forEach((c, i) => {
    const li = el('li'), b = el('button'); b.type = 'button';
    b.setAttribute('aria-label', 'Choice ' + (i + 1) + ': ' + c.said);
    const eq = el('span', 'eqv'); renderTex(eq, c.latex, false);
    b.append(el('span', 'num', String(i + 1)), eq, el('span', 'said', '“' + c.said + '”'));
    b.onclick = () => chooseOption(i + 1);
    li.appendChild(b); ol.appendChild(li);
  });
}
function chooseOption(k) {
  if (!aiChoices) return false;
  if (k < 1 || k > aiChoices.length) { setStatus('Say a number from 1 to ' + aiChoices.length + '.', 'err'); return true; }
  const c = aiChoices[k - 1], req = aiChoices.req; clearChoices();
  setLatex(c.latex); devSetResult(current.latex);
  setStatus('Applied choice ' + k + ': “' + c.said + '”. Say “Save” to keep it.', 'ok');
  $('announce').textContent = 'Applied choice ' + k + ': ' + c.said;
  current.input = (current.input || spoken.value.trim()) + (req ? ' · then: ' + req : ''); current.method = 'refine'; current.src = vMode === 'off' ? 'typed' : 'voice';
  return true;
}
/* "1", "one", "option 2", "number three"… while choices are showing */
function choiceNum(n) {
  const m = n.match(/^(?:option |number |choice |choose |pick )?(1|2|3|one|won|two|to|too|three)$/);
  return m ? ({ 1: 1, one: 1, won: 1, 2: 2, two: 2, to: 2, too: 2, 3: 3, three: 3 })[m[1]] : 0;
}

/* Refine with AI (toggle on): Claude returns 3 readings of the change to the selected layer */
async function refineAI() {
  if (!L) { setStatus('Submit an equation first.', 'err'); return; }
  if (!sample) { setStatus('Refine with AI needs Claude. Add your API key in the sidebar, or turn “Refine with AI” off.', 'err'); return; }
  const req = wsInput.value.trim(), sc = scopeInfo();
  clearChoices(); vBusy = true; updateBar(); setStatus('Refining ' + sc.name + ' with Claude…');
  try {
    const r = await aiCall('refine', 
      'You edit a LaTeX equation for a student who works by voice. The request comes from speech recognition and may contain recognition errors; infer the intended math.\n' +
      'Full equation: ' + JSON.stringify(current.latex) + '\n' +
      'Selected part (' + sc.name + '): ' + JSON.stringify(sc.tex) + '\n' +
      'Request: ' + JSON.stringify(req || 'Fix likely speech-recognition or notation mistakes in the selected part.') + '\n' +
      'Change only the selected part unless the request clearly says otherwise; keep everything else identical. ' +
      'The request may be ambiguous, so give 3 different plausible readings of it, most likely first. Each must be a different equation. ' +
      'Return JSON only: {"options": [string, string, string]}, each the full updated equation body, no $ or \\[ delimiters, valid for MathJax with amsmath.',
      { modelTier: 'quick' });
    const opts = r && Array.isArray(r.options) ? [...new Set(r.options.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim()))].slice(0, 3) : [];
    if (!opts.length) throw new Error('No LaTeX came back');
    const list = opts.map((latex) => { let said = latex; try { said = Layers.plainText(Layers.build(latex).spokenHtml); } catch (e) {} return { latex, said }; });
    list.req = req;
    wsInput.value = ''; showChoices(list);
    const n = list.length, read = list.map((c, i) => (i + 1) + ': ' + c.said).join('. ');
    setStatus('Pick a choice under “Editing”: say ' + (n === 1 ? '“1”' : 'a number from 1 to ' + n) + '.', 'ok');
    $('announce').textContent = n + ' choice' + (n === 1 ? '' : 's') + '. ' + read + '. Say the number of the one you want.';
  } catch (e) {
    if (e && e.code === 'not_granted' && window.claude) { sample = null; markNoClaude(); aiRefine = false; }
    setStatus('Couldn\'t refine with Claude' + (e && e.message ? ': ' + e.message : '') + '. Try again or turn “Refine with AI” off.', 'err');
  } finally { vBusy = false; updateBar(); }
}
