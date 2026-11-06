// Speak Math. Classic script: shares top-level names with the other js/ files. Load order is set in index.html.
// Tabs (pages) and the retractable sidebar

/* ---------- Pages and sidebar ---------- */
const PAGES = { workspace: 'Math Workspace', help: 'MathSpeak Help', export: 'Export', organize: 'Organize & Export' };
function go(page, focus) {
  if (!PAGES[page]) page = 'workspace';
  Object.keys(PAGES).forEach((k) => { $('page-' + k).hidden = k !== page; });
  const navPage = page === 'organize' ? 'export' : page;
  document.querySelectorAll('.nav [data-page]').forEach((b) => { if (b.dataset.page === navPage) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('pageTitle').textContent = PAGES[page]; document.title = PAGES[page] + ' · Speak Math';
  if (page === 'workspace') highlight();
  if (page === 'organize') { let n = 0; try { n = blocks.length; } catch (e) {} if (!n) { go('export'); return; } renderBlocks(); }   // nothing to organize after a reload
  if (location.hash !== '#' + page) { try { history.replaceState(null, '', '#' + page); } catch (e) {} }
  if (focus) $('pageTitle').focus();
  if (matchMedia('(max-width: 720px)').matches && focus) setSide(false);
}
document.querySelectorAll('.nav [data-page]').forEach((b) => b.onclick = () => go(b.dataset.page, true));
window.addEventListener('hashchange', () => go(location.hash.slice(1)));
const ICON = (d) => '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const I_MENU = ICON('<path d="M4 6h16M4 12h16M4 18h16"/>');
const I_CLOSE = ICON('<rect x="3.5" y="4.5" width="17" height="15"/><path d="M9 4.5v15M15.5 10l-2 2 2 2"/>');
function setSide(open) {
  document.body.classList.toggle('side-off', !open);
  const b = $('sideBtn'); b.innerHTML = open ? I_CLOSE : I_MENU;
  b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-label', open ? 'Hide sidebar' : 'Show sidebar');
  try { localStorage.setItem('speak-math-side', open ? '1' : '0'); } catch (e) {}
  if (open && page() === 'workspace') requestAnimationFrame(highlight);
}
const page = () => Object.keys(PAGES).find((k) => !$('page-' + k).hidden);
$('sideBtn').onclick = () => setSide(document.body.classList.contains('side-off'));
let sideOpen = !matchMedia('(max-width: 720px)').matches;
try { const v = localStorage.getItem('speak-math-side'); if (v && sideOpen) sideOpen = v === '1'; } catch (e) {}
setSide(sideOpen);
go(location.hash.slice(1) || 'workspace');
