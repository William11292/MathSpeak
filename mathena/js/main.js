// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Wiring and start-up. Loads last.

/* ---------- Wiring ---------- */
spoken.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) convert(); });
spoken.addEventListener('input', () => { if (!listening) current.source = 'typed'; });
document.querySelectorAll('[data-ex]').forEach((b) => b.onclick = () => { spoken.value = b.dataset.ex; current.source = 'typed'; spoken.focus(); });
let t; latexEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { setStatus(''); setLatex(latexEl.value, { fromEditor: true }); }, 250); });

function boot() {
  setLatex(ruleParse(spoken.value));
  seedChat(); renderChat();
  if (!logCol) renderLog(localLog);
}
loadLocal();
window.__mjReady = () => { boot(); };
if (mjReady()) window.__mjReady();
setTimeout(() => { if (!mjReady()) { setLatex(ruleParse(spoken.value)); stage.textContent = 'The math renderer couldn\'t load. The LaTeX and clean text still work.'; renderLog(localLog); } }, 8000);

if (window.claude && claude.use) {
  claude.use('sample').then((s) => { sample = s; if (!s) markNoClaude(); });
  claude.use('downloads').then((d) => { downloads = d; });
  Promise.all([claude.use('db'), claude.use('user')]).then(async ([d, u]) => {
    if (!d || !u) return;
    try {
      const id = await u.id(); if (!id) return;
      logCol = d.collection('data/users/' + id);
      $('log-where').textContent = 'Saved to your account';
      logCol.orderBy('ts', 'desc').limit(100).onSnapshot(
        (snap) => renderLog(snap.docs.map((x) => Object.assign({ id: x.id }, x.data()))),
        () => { logCol = null; $('log-where').textContent = 'Saved in this browser'; renderLog(localLog); }
      );
    } catch (e) { logCol = null; }
  });
} else {
  setupApiKey();
}
