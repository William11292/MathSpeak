// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: Select that, Delete, Save, Refine with AI

/* "Select that": confirm the selection, read it back, and scope edits to it */
function selectThat() {
  if (!L) return;
  if (sel == null) sel = L.root.id;
  const n = L.byId.get(sel), say = Layers.plainText(L.speak(n)), sc = scopeInfo();
  highlight();
  setStatus('Selected ' + sc.name + ': “' + say + '”. Say “Delete”, or “Say a change”.', 'ok');
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

/* "Refine with AI": Claude applies the spoken or typed change to the selected layer */
async function refineAI() {
  if (!L) { setStatus('Submit an equation first.', 'err'); return; }
  if (!sample) { setStatus('Refine with AI needs Claude. Add your API key in the sidebar, or use “Refine manually”.', 'err'); return; }
  const req = wsInput.value.trim(), sc = scopeInfo();
  vBusy = true; updateBar(); setStatus('Refining ' + sc.name + ' with Claude…');
  try {
    const r = await aiCall('refine', 
      'You edit a LaTeX equation for a student who works by voice. The request comes from speech recognition and may contain recognition errors; infer the intended math.\n' +
      'Full equation: ' + JSON.stringify(current.latex) + '\n' +
      'Selected part (' + sc.name + '): ' + JSON.stringify(sc.tex) + '\n' +
      'Request: ' + JSON.stringify(req || 'Fix likely speech-recognition or notation mistakes in the selected part.') + '\n' +
      'Change only the selected part unless the request clearly says otherwise; keep everything else identical. ' +
      'Return JSON only: {"latex": string} with the full updated equation body, no $ or \\[ delimiters, valid for MathJax with amsmath.',
      { modelTier: 'quick' });
    if (!r || typeof r.latex !== 'string' || !r.latex.trim()) throw new Error('No LaTeX came back');
    setLatex(r.latex.trim()); wsInput.value = ''; devSetResult(current.latex);
    const clean = L ? Layers.plainText(L.spokenHtml) : '';
    setStatus('Refined with Claude: “' + clean + '”. Say “Save” to keep it.', 'ok');
    current.input = (current.input || spoken.value.trim()) + (req ? ' · then: ' + req : ''); current.method = 'refine'; current.src = vMode === 'off' ? 'typed' : 'voice';
  } catch (e) {
    if (e && e.code === 'not_granted' && window.claude) { sample = null; markNoClaude(); }
    setStatus('Couldn\'t refine with Claude' + (e && e.message ? ': ' + e.message : '') + '. Try again or use “Refine manually”.', 'err');
  } finally { vBusy = false; updateBar(); }
}
