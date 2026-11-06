// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Math Workspace: rendering, selection and highlighting

/* ---------- Rendering ---------- */
function renderTex(el, tex, display = true) {
  if (!mjReady()) { el.textContent = tex; return false; }
  el.textContent = '';
  try {
    const node = MathJax.tex2svg(tex, { display });
    el.appendChild(node);
    return !node.querySelector('[data-mjx-error], merror, [data-mml-node="merror"]');
  } catch (e) { el.textContent = tex; return false; }
}

function setLatex(latex, opts = {}) {
  current.latex = latex;
  try { L = latex.trim() ? Layers.build(latex) : null; } catch (e) { L = null; }
  if (!opts.fromEditor) latexEl.value = latex;
  if (!L) sel = null;
  else if (sel == null || !L.byId.has(sel) || !opts.fromEditor) sel = L.root.id;   // a new equation starts at the whole equation
  renderResults();
  if (typeof updateBar === 'function') try { updateBar(); } catch (e) {}
}

function renderResults() {
  const tex = current.latex;
  if (!tex.trim()) {
    stage.innerHTML = '<span class="placeholder">Your equation will appear here.</span>';
    latexView.textContent = ''; cleanView.textContent = ''; renderChain(); return;
  }
  let ok = L ? renderTex(stage, L.tagged) : false;
  if (!ok) ok = renderTex(stage, tex);
  if (!ok && mjReady()) setStatus('That LaTeX has an error. Fix the equation input and submit again.', 'err');
  latexView.innerHTML = L ? L.html : esc(tex);
  cleanView.innerHTML = L ? L.spokenHtml : '<span class="hint">Couldn\'t read this LaTeX into layers.</span>';
  highlight();
}

/* ---------- Explore: selection and highlighting ---------- */
function chainOf(id) {
  const out = []; let n = L && L.byId.get(id);
  while (n) { out.unshift(n); n = L.parent(n); }
  return out;
}
const colorIdx = (pos) => ((Math.max(pos, 1) - 1) % 5) + 1;

function highlight() {
  document.querySelectorAll('.vw .nd.hl').forEach((e) => { e.classList.remove('hl', 'sel'); });
  document.querySelectorAll('rect.mx-hl').forEach((r) => r.remove());
  if (!live() || sel == null) { renderChain(); return; }
  const chain = chainOf(sel);
  const svgs = [stage.querySelector('svg')].filter(Boolean);
  chain.forEach((n, pos) => {
    if (pos === 0 && chain.length > 1) return;
    const ci = colorIdx(pos), isSel = n.id === sel;
    document.querySelectorAll('.vw [data-n="' + n.id + '"]').forEach((e) => {
      e.classList.add('hl'); e.style.setProperty('--hc', 'var(--l' + ci + ')'); e.style.setProperty('--hs', 'var(--s' + ci + ')');
      if (isSel) e.classList.add('sel');
    });
    svgs.forEach((svg) => svg.querySelectorAll('.mx-' + n.id).forEach((g) => addRect(g, ci, isSel)));
  });
  renderChain(chain);
}
function addRect(g, ci, isSel) {
  let bb; try { bb = g.getBBox(); } catch (e) { return; }
  if (!bb || (!bb.width && !bb.height)) return;
  const pad = 45;
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  r.setAttribute('class', 'mx-hl');
  r.setAttribute('x', bb.x - pad); r.setAttribute('y', bb.y - pad);
  r.setAttribute('width', bb.width + pad * 2); r.setAttribute('height', bb.height + pad * 2);
  r.setAttribute('rx', 70);
  r.setAttribute('style', 'fill:var(--l' + ci + ');' + (isSel ? 'stroke:var(--s' + ci + ');stroke-width:45;' : 'stroke:none;'));
  g.insertBefore(r, g.firstChild);
}

function renderChain(chain) { renderWsNav(chain); }

function select(id) {
  if (id == null || id === sel) return;
  sel = id; highlight();
  const n = L.byId.get(id);
  $('announce').textContent = L.label(n) + ': ' + Layers.plainText(L.speak(n));
}
function nodeFromEvent(e) {
  let el = e.target;
  while (el && el !== e.currentTarget) {
    if (el.dataset && el.dataset.n != null) return +el.dataset.n;
    const cls = el.getAttribute && el.getAttribute('class');
    if (cls) { const m = cls.match(/(?:^|\s)mx-(\d+)(?:\s|$)/); if (m) return +m[1]; }
    el = el.parentNode;
  }
  return null;
}
function target(key) {
  const n = sel == null ? L.root : L.byId.get(sel);
  if (sel == null) return n;
  if (key === 'ArrowUp') return L.parent(n);
  if (key === 'ArrowDown') return L.nav(n)[0] || null;
  const p = L.parent(n); if (!p) return null;
  const sib = L.nav(p); return sib[sib.indexOf(n) + (key === 'ArrowRight' ? 1 : -1)] || null;
}
function move(key) {
  if (!live()) return;
  if (key === 'Escape') { sel = null; highlight(); return; }
  const t = target(key); if (t) select(t.id);
}
function navKey(e) {
  if (!live()) return;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return;
  e.preventDefault(); move(e.key);
}
[stage, latexView, cleanView].forEach((v) => {
  v.addEventListener('click', (e) => { if (L) select(nodeFromEvent(e)); });
  v.addEventListener('keydown', navKey);
  v.addEventListener('focus', () => { if (L && sel == null) select(L.root.id); });
});
