// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: convert spoken input to LaTeX

/* ---------- Convert ---------- */
async function convert() {
  const text = spoken.value.trim();
  if (!text) { setStatus('Type or dictate an equation first.', 'err'); spoken.focus(); return; }
  vBusy = true; updateBar();
  let latex = '', method = 'rules', note = '';
  try {
    if (looksLikeLatex(text)) { latex = text; method = 'latex'; }
    else if ($('engine').value === 'claude' && sample) {
      setStatus('Converting with Claude…');
      try {
        const r = await sample.json(
          'You convert spoken mathematics into LaTeX. The input is a transcript from speech recognition and may contain recognition errors (e.g. "x to" for "x two", "some" for "sum", "intro" for "integral"); infer the intended math. Scope cues like "the quantity … close quantity", "end root", "end exponent" and "all over" mark where a group ends.\n' +
          'Return JSON only: {"latex": string}. "latex" is the equation body only, no $ or \\[ delimiters, valid for MathJax with amsmath. Prefer \\frac, \\sqrt{}, \\left( \\right), \\int_{a}^{b}, \\sum_{}^{}, \\lim_{x \\to a}, bmatrix, \\,dx.\n\nTranscript: ' + JSON.stringify(text),
          { modelTier: 'quick' }
        );
        if (r && typeof r.latex === 'string' && r.latex.trim()) { latex = r.latex.trim(); method = 'claude'; }
      } catch (e) {
        if (e && e.code === 'not_granted' && window.claude) { sample = null; markNoClaude(); }
        note = 'Claude was unavailable' + (e && e.message && !window.claude ? ' (' + e.message + ')' : '') + ', so the built-in rules were used.';
      }
    }
    if (!latex) latex = ruleParse(text);
    setStatus('');
    setLatex(latex);
    chatNewEquation();
    const clean = L ? Layers.plainText(L.spokenHtml) : '';
    if (statusEl.className !== 'status err') setStatus(note || (method === 'claude' ? 'Converted with Claude. Say “Save” to keep it.' : method === 'latex' ? 'Rendered your LaTeX. Say “Save” to keep it.' : 'Converted with the built-in rules. Say “Save” to keep it.'), note ? 'err' : 'ok');
    current.input = text; current.method = method; current.src = current.source;
    current.source = 'typed';
  } finally { vBusy = false; updateBar(); }
}
function markNoClaude() {
  const s = $('engine'); s.value = 'rules'; s.options[0].disabled = true; s.options[0].textContent = 'Claude (not available here)';
}
